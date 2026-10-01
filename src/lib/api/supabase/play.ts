import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdmin, type Viewer } from '@/domain/household'
import { isValid } from '@/domain/news'
import { byState, filledOptions, validatePoll, type Poll, type PollDraft, type PollResults, type PollView } from '@/domain/polls'
import {
  validateQuestion,
  validateQuiz,
  type BankQuestion,
  type Question,
  type QuestionDraft,
  type Quiz,
  type QuizAudience,
  type QuizDraft,
} from '@/domain/quizzes'
import {
  suggestionsForReview,
  tidySuggestion,
  validateSuggestion,
  type Suggestion,
  type SuggestionKind,
  type SuggestionStatus,
} from '@/domain/suggestions'
import { NotAllowed } from '../mock'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { dataClient } from '@/lib/auth/supabaseAuth'

type Failure = { code?: string; message: string } | null

/**
 * The database's answers, in words.
 *
 * 45010 is the code `polls-quizzes.sql` raises with a sentence meant for a person — "this poll
 * has closed" — so that sentence is shown as it is. 42501 is somebody asking for what they
 * could never have, and 23503 is a question still sitting in a quiz.
 */
export function refuse(fallback: string, error: Failure): never {
  if (error?.code === '45010') throw new Error(error.message)
  if (error?.code === '42501') throw new NotAllowed(fallback)
  if (error?.code === '23503') throw new Error('This question is in a quiz. Take it out of the quiz first.')
  throw new Error(error?.message ?? fallback)
}

/** One-to-one embeds come back as an object or a one-item list depending on the server's mood. */
const one = <T,>(value: T | T[] | null | undefined): T | undefined => (Array.isArray(value) ? value[0] : (value ?? undefined))

// ---- rows -------------------------------------------------------------------

type PollRow = {
  id: string
  title: string
  detail: string
  options: string[]
  named: boolean
  results: PollResults
  opens_at: string | null
  closes_at: string | null
  created_at: string
}

export function toPoll(row: PollRow): Poll {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    options: row.options,
    named: row.named,
    results: row.results,
    ...(row.opens_at ? { opensAt: row.opens_at } : {}),
    ...(row.closes_at ? { closesAt: row.closes_at } : {}),
    createdAt: row.created_at,
  }
}

export function fromPoll(draft: PollDraft) {
  return {
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    options: filledOptions(draft.options),
    named: draft.named,
    results: draft.results,
    opens_at: draft.opensAt || null,
    closes_at: draft.closesAt || null,
  }
}

type ItemRow = { question_id: string; position: number }
type QuizRow = {
  id: string
  title: string
  intro: string
  audience: QuizAudience
  opens_at: string | null
  closes_at: string | null
  created_at: string
  quiz_items?: ItemRow[] | null
}

export function toQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    title: row.title,
    intro: row.intro,
    audience: row.audience,
    ...(row.opens_at ? { opensAt: row.opens_at } : {}),
    ...(row.closes_at ? { closesAt: row.closes_at } : {}),
    createdAt: row.created_at,
    questionIds: [...(row.quiz_items ?? [])].sort((a, b) => a.position - b.position).map((item) => item.question_id),
  }
}

type QuestionRow = {
  id: string
  prompt: string
  options: string[]
  image_url: string | null
  explanation: string
  tags: string[] | null
  credited_to: string | null
}

export function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    prompt: row.prompt,
    options: row.options,
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    explanation: row.explanation,
    tags: row.tags ?? [],
    ...(row.credited_to ? { creditedTo: row.credited_to } : {}),
  }
}

type SuggestionRow = {
  id: string
  kind: SuggestionKind
  prompt: string
  options: string[]
  answer: number | null
  note: string
  credit: boolean
  household_id: string
  status: SuggestionStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  households?: { name: string } | { name: string }[] | null
}

export function toSuggestion(row: SuggestionRow): Suggestion {
  const household = one(row.households)?.name
  return {
    id: row.id,
    kind: row.kind,
    prompt: row.prompt,
    options: row.options,
    ...(row.answer !== null ? { answer: row.answer } : {}),
    note: row.note,
    credit: row.credit,
    householdId: row.household_id,
    ...(household ? { household } : {}),
    status: row.status,
    ...(row.reviewed_by ? { reviewedBy: row.reviewed_by } : {}),
    ...(row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
    createdAt: row.created_at,
  }
}

// ---- methods ----------------------------------------------------------------

/**
 * Polls, quizzes and suggestions against the real database.
 *
 * Every read leans on row level security for who may see what, and every vote, play and
 * answer goes through the functions in `polls-quizzes.sql` — the tables themselves take no
 * vote or score from a browser. Where the contract promises "empty for anybody who is not an
 * admin", that is checked here as well, so the promise does not quietly become "whatever the
 * read policies happen to admit".
 */
export function playMethods(
  getClient: () => Promise<SupabaseClient>,
  now: () => Date = () => new Date(),
): Pick<ApiClient, 'polls' | 'quizzes' | 'suggestions'> {
  const from = (client: SupabaseClient, table: string) => client.schema('portal').from(table)
  const rpc = (client: SupabaseClient, name: string, args: Record<string, unknown>) => client.schema('portal').rpc(name, args)
  /** The household this viewer votes as. An admin with no household of their own has none. */
  const householdOf = (viewer: Viewer) => viewer?.householdId || null

  async function tallyOf(client: SupabaseClient, pollId: string): Promise<number[] | undefined> {
    const { data } = await rpc(client, 'poll_results', { p_poll: pollId })
    const rows = (data ?? []) as { option: number; votes: number }[]
    if (rows.length === 0) return undefined
    return [...rows].sort((a, b) => a.option - b.option).map((row) => row.votes)
  }

  async function viewsOf(client: SupabaseClient, polls: Poll[], viewer: Viewer): Promise<PollView[]> {
    const household = householdOf(viewer)
    const mine = new Map<string, number>()
    if (household && polls.length > 0) {
      const { data } = await from(client, 'poll_votes')
        .select('poll_id, option')
        .eq('household_id', household)
        .in('poll_id', polls.map((p) => p.id))
      for (const row of (data ?? []) as { poll_id: string; option: number }[]) mine.set(row.poll_id, row.option)
    }
    return Promise.all(
      polls.map(async (poll) => {
        const tally = await tallyOf(client, poll.id)
        const myVote = mine.get(poll.id)
        return { poll, ...(myVote !== undefined ? { myVote } : {}), ...(tally ? { tally } : {}) }
      }),
    )
  }

  async function quizWithItems(client: SupabaseClient, id: string): Promise<Quiz> {
    const { data, error } = await from(client, 'quizzes').select('*, quiz_items(question_id, position)').eq('id', id).maybeSingle()
    if (error || !data) refuse('no such quiz', error)
    return toQuiz(data as QuizRow)
  }

  async function bank(client: SupabaseClient): Promise<BankQuestion[]> {
    const [questions, items, attempts, plays] = await Promise.all([
      from(client, 'quiz_questions').select('*, quiz_answers(correct)').order('created_at', { ascending: false }),
      from(client, 'quiz_items').select('quiz_id, question_id'),
      from(client, 'quiz_attempts').select('quiz_id'),
      from(client, 'quiz_public_plays').select('quiz_id, plays'),
    ])
    const played = new Set([
      ...((attempts.data ?? []) as { quiz_id: string }[]).map((a) => a.quiz_id),
      ...((plays.data ?? []) as { quiz_id: string; plays: number }[]).filter((p) => p.plays > 0).map((p) => p.quiz_id),
    ])
    const locked = new Set(
      ((items.data ?? []) as { quiz_id: string; question_id: string }[]).filter((i) => played.has(i.quiz_id)).map((i) => i.question_id),
    )
    return ((questions.data ?? []) as (QuestionRow & { quiz_answers?: { correct: number } | { correct: number }[] | null })[]).map(
      (row) => ({ ...toQuestion(row), correct: one(row.quiz_answers)?.correct ?? 0, locked: locked.has(row.id) }),
    )
  }

  const questionArgs = (id: string | null, draft: QuestionDraft) => ({
    p_id: id,
    p_prompt: draft.prompt.trim(),
    p_options: draft.options.map((o) => o.trim()),
    p_correct: draft.correct,
    p_explanation: draft.explanation.trim(),
    p_tags: draft.tags,
    p_image_url: draft.imageUrl.trim() || null,
    p_credited_to: draft.creditedTo.trim() || null,
  })

  const quizArgs = (id: string | null, draft: QuizDraft) => ({
    p_id: id,
    p_title: draft.title.trim(),
    p_intro: draft.intro.trim(),
    p_audience: draft.audience,
    p_opens_at: draft.opensAt || null,
    p_closes_at: draft.closesAt || null,
    p_questions: draft.questionIds,
  })

  async function reviewerName(client: SupabaseClient, viewer: Viewer): Promise<string> {
    const { data } = await from(client, 'households').select('name').eq('id', viewer?.householdId ?? '').maybeSingle()
    return (data as { name: string } | null)?.name ?? 'The committee'
  }

  return {
    polls: {
      list: async (viewer) => {
        if (!viewer) return []
        const client = await getClient()
        const { data } = await from(client, 'polls').select('*').not('opens_at', 'is', null).lte('opens_at', now().toISOString())
        const polls = byState(((data ?? []) as PollRow[]).map(toPoll), now())
        return viewsOf(client, polls, viewer)
      },

      vote: async (pollId, option, viewer) => {
        const client = await getClient()
        const { error } = await rpc(client, 'cast_vote', { p_poll: pollId, p_option: option })
        if (error) refuse('only members can vote', error)
        const { data } = await from(client, 'polls').select('*').eq('id', pollId).maybeSingle()
        if (!data) throw new NotAllowed('no such poll')
        const [view] = await viewsOf(client, [toPoll(data as PollRow)], viewer)
        return view
      },

      listAll: async (viewer) => {
        if (!isAdmin(viewer)) return []
        const client = await getClient()
        const { data } = await from(client, 'polls').select('*')
        const polls = byState(((data ?? []) as PollRow[]).map(toPoll), now())
        const named = polls.filter((p) => p.named).map((p) => p.id)
        const voters = new Map<string, { household: string; option: number }[]>()
        if (named.length > 0) {
          const { data: rows } = await from(client, 'poll_votes').select('poll_id, option, households(name)').in('poll_id', named)
          for (const row of (rows ?? []) as { poll_id: string; option: number; households: { name: string } | { name: string }[] | null }[]) {
            const list = voters.get(row.poll_id) ?? []
            list.push({ household: one(row.households)?.name ?? 'A household', option: row.option })
            voters.set(row.poll_id, list)
          }
        }
        return Promise.all(
          polls.map(async (poll) => ({
            poll,
            tally: (await tallyOf(client, poll.id)) ?? poll.options.map(() => 0),
            ...(poll.named
              ? { voters: (voters.get(poll.id) ?? []).sort((a, b) => a.option - b.option || a.household.localeCompare(b.household)) }
              : {}),
          })),
        )
      },

      create: async (draft) => {
        if (!isValid(validatePoll(draft))) throw new Error('Please check the poll and try again.')
        const { data, error } = await from(await getClient(), 'polls').insert(fromPoll(draft)).select('*').single()
        if (error || !data) refuse('only the committee can make a poll', error)
        return toPoll(data as PollRow)
      },

      update: async (id, draft) => {
        if (!isValid(validatePoll(draft))) throw new Error('Please check the poll and try again.')
        const { data, error } = await from(await getClient(), 'polls').update(fromPoll(draft)).eq('id', id).select('*').maybeSingle()
        if (error) refuse('only the committee can change a poll', error)
        if (!data) throw new NotAllowed('no such poll')
        return toPoll(data as PollRow)
      },

      remove: async (id) => {
        const { data, error } = await from(await getClient(), 'polls').delete().eq('id', id).select('id').maybeSingle()
        if (error) refuse('only the committee can delete a poll', error)
        if (!data) throw new NotAllowed('no such poll')
      },
    },

    quizzes: {
      list: async (viewer) => {
        const client = await getClient()
        const { data } = await from(client, 'quizzes')
          .select('*, quiz_items(question_id, position)')
          .not('opens_at', 'is', null)
          .lte('opens_at', now().toISOString())
        const quizzes = byState(((data ?? []) as QuizRow[]).map(toQuiz), now())
        const household = householdOf(viewer)
        const mine = new Map<string, { score: number; total: number }>()
        if (household && quizzes.length > 0) {
          const { data: rows } = await from(client, 'quiz_attempts').select('quiz_id, score, total').eq('household_id', household)
          for (const row of (rows ?? []) as { quiz_id: string; score: number; total: number }[]) {
            mine.set(row.quiz_id, { score: row.score, total: row.total })
          }
        }
        return quizzes.map((quiz) => {
          const played = mine.get(quiz.id)
          return { quiz, questionCount: quiz.questionIds.length, ...(played ? { played } : {}) }
        })
      },

      get: async (id) => {
        const client = await getClient()
        const { data } = await from(client, 'quizzes')
          .select('*, quiz_items(question_id, position, quiz_questions(*))')
          .eq('id', id)
          .maybeSingle()
        if (!data) return null
        const row = data as QuizRow & { quiz_items: (ItemRow & { quiz_questions: QuestionRow | QuestionRow[] | null })[] | null }
        const questions = [...(row.quiz_items ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((item) => one(item.quiz_questions))
          .filter((q): q is QuestionRow => Boolean(q))
          .map(toQuestion)
        return { quiz: toQuiz(row), questions }
      },

      submit: async (id, answers, showName) => {
        const { data, error } = await rpc(await getClient(), 'submit_quiz', { p_quiz: id, p_answers: answers, p_show_name: showName })
        if (error) refuse('this quiz is for members', error)
        const row = one(data as { score: number; total: number; correct: number[]; explanations: string[] }[] | null)
        if (!row) throw new Error('The quiz could not be marked just now. Please try again.')
        return { score: row.score, total: row.total, correct: row.correct ?? [], explanations: row.explanations ?? [] }
      },

      leaderboard: async (id, viewer) => {
        if (!viewer) return []
        const { data } = await rpc(await getClient(), 'quiz_leaderboard', { p_quiz: id })
        return ((data ?? []) as { household: string | null; score: number; total: number }[]).map((row) => ({
          ...(row.household ? { household: row.household } : {}),
          score: row.score,
          total: row.total,
        }))
      },

      listAll: async (viewer) => {
        if (!isAdmin(viewer)) return []
        const client = await getClient()
        const [quizzes, attempts, plays] = await Promise.all([
          from(client, 'quizzes').select('*, quiz_items(question_id, position)'),
          from(client, 'quiz_attempts').select('quiz_id'),
          from(client, 'quiz_public_plays').select('quiz_id, plays'),
        ])
        const count = new Map<string, number>()
        for (const a of (attempts.data ?? []) as { quiz_id: string }[]) count.set(a.quiz_id, (count.get(a.quiz_id) ?? 0) + 1)
        const visitors = new Map(((plays.data ?? []) as { quiz_id: string; plays: number }[]).map((p) => [p.quiz_id, p.plays]))
        return byState(((quizzes.data ?? []) as QuizRow[]).map(toQuiz), now()).map((quiz) => {
          const memberPlays = count.get(quiz.id) ?? 0
          const publicPlays = visitors.get(quiz.id) ?? 0
          return { quiz, memberPlays, publicPlays, locked: memberPlays + publicPlays > 0 }
        })
      },

      create: async (draft) => {
        if (!isValid(validateQuiz(draft))) throw new Error('Please check the quiz and try again.')
        const client = await getClient()
        const { data, error } = await rpc(client, 'save_quiz', quizArgs(null, draft))
        if (error || !data) refuse('only the committee can make a quiz', error)
        return quizWithItems(client, data as string)
      },

      update: async (id, draft) => {
        if (!isValid(validateQuiz(draft))) throw new Error('Please check the quiz and try again.')
        const client = await getClient()
        const { error } = await rpc(client, 'save_quiz', quizArgs(id, draft))
        if (error) refuse('only the committee can change a quiz', error)
        return quizWithItems(client, id)
      },

      remove: async (id) => {
        const { data, error } = await from(await getClient(), 'quizzes').delete().eq('id', id).select('id').maybeSingle()
        if (error) refuse('only the committee can delete a quiz', error)
        if (!data) throw new NotAllowed('no such quiz')
      },

      attempts: async (id, viewer) => {
        if (!isAdmin(viewer)) return []
        const { data } = await from(await getClient(), 'quiz_attempts')
          .select('score, total, show_name, played_at, households(name)')
          .eq('quiz_id', id)
          .order('score', { ascending: false })
          .order('played_at', { ascending: true })
        return ((data ?? []) as { score: number; total: number; show_name: boolean; played_at: string; households: { name: string } | { name: string }[] | null }[]).map(
          (row) => ({
            household: one(row.households)?.name ?? 'A household since erased',
            score: row.score,
            total: row.total,
            showName: row.show_name,
            playedAt: row.played_at,
          }),
        )
      },

      bank: async (viewer) => (isAdmin(viewer) ? bank(await getClient()) : []),

      createQuestion: async (draft) => {
        if (!isValid(validateQuestion(draft))) throw new Error('Please check the question and try again.')
        const client = await getClient()
        const { data, error } = await rpc(client, 'save_question', questionArgs(null, draft))
        if (error || !data) refuse('only the committee can write a question', error)
        const saved = (await bank(client)).find((q) => q.id === data)
        if (!saved) throw new NotAllowed('no such question')
        return saved
      },

      updateQuestion: async (id, draft) => {
        if (!isValid(validateQuestion(draft))) throw new Error('Please check the question and try again.')
        const client = await getClient()
        const { error } = await rpc(client, 'save_question', questionArgs(id, draft))
        if (error) refuse('only the committee can change a question', error)
        const saved = (await bank(client)).find((q) => q.id === id)
        if (!saved) throw new NotAllowed('no such question')
        return saved
      },

      removeQuestion: async (id) => {
        const { data, error } = await from(await getClient(), 'quiz_questions').delete().eq('id', id).select('id').maybeSingle()
        if (error) refuse('only the committee can delete a question', error)
        if (!data) throw new NotAllowed('no such question')
      },
    },

    suggestions: {
      send: async (draft) => {
        if (!isValid(validateSuggestion(draft))) throw new Error('Please check the suggestion and try again.')
        const tidy = tidySuggestion(draft)
        const { data, error } = await from(await getClient(), 'suggestions')
          .insert({
            kind: tidy.kind,
            prompt: tidy.prompt,
            options: tidy.options,
            answer: tidy.answer ?? null,
            note: tidy.note,
            credit: tidy.credit,
          })
          // Readable back, unlike feedback: a member reads their own suggestions.
          .select('*')
          .single()
        if (error || !data) refuse('only members can make a suggestion', error)
        return toSuggestion(data as SuggestionRow)
      },

      listMine: async (viewer) => {
        const household = householdOf(viewer)
        if (!household) return []
        const { data } = await from(await getClient(), 'suggestions')
          .select('*')
          .eq('household_id', household)
          .order('created_at', { ascending: false })
        return ((data ?? []) as SuggestionRow[]).map(toSuggestion)
      },

      listAll: async (viewer) => {
        if (!isAdmin(viewer)) return []
        const { data } = await from(await getClient(), 'suggestions').select('*, households(name)')
        return suggestionsForReview(((data ?? []) as SuggestionRow[]).map(toSuggestion))
      },

      review: async (id, status, viewer) => {
        const client = await getClient()
        const decided =
          status === 'pending'
            ? { status, reviewed_by: null, reviewed_at: null }
            : { status, reviewed_by: await reviewerName(client, viewer), reviewed_at: new Date().toISOString() }
        const { data, error } = await from(client, 'suggestions').update(decided).eq('id', id).select('*, households(name)').maybeSingle()
        if (error) refuse('only the committee can review a suggestion', error)
        if (!data) throw new NotAllowed('no such suggestion')
        return toSuggestion(data as SuggestionRow)
      },

      remove: async (id) => {
        const { data, error } = await from(await getClient(), 'suggestions').delete().eq('id', id).select('id').maybeSingle()
        if (error) refuse('only the committee can do that', error)
        if (!data) throw new NotAllowed('no such suggestion')
      },
    },
  }
}

/** The same methods, on the client that carries the signed-in session. */
export function withSupabasePlay(base: ApiClient, config: SupabaseConfig): ApiClient {
  return { ...base, ...playMethods(() => dataClient(config)) }
}
