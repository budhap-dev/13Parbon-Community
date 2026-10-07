import { isAdmin, type Household, type Viewer } from '@/domain/household'
import { isValid } from '@/domain/news'
import {
  byState,
  canSeeResults,
  filledOptions,
  stateOf,
  validatePoll,
  type Poll,
  type PollDraft,
  type PollView,
} from '@/domain/polls'
import {
  mark,
  validateQuestion,
  validateQuiz,
  type BankQuestion,
  type Question,
  type QuestionDraft,
  type Quiz,
  type QuizDraft,
} from '@/domain/quizzes'
import { suggestionsForReview, tidySuggestion, validateSuggestion, type Suggestion } from '@/domain/suggestions'
import type { ApiClient } from '../types'
import { buildPlayFixtures } from './play-fixtures'
import type { HouseholdExport } from '@/domain/subjectAccess'

type Options = {
  now: () => Date
  latencyMs: number
  /** The mock's households, read live so a household deleted elsewhere is gone here too. */
  households: Household[]
  NotAllowed: new (what: string) => Error
}

/**
 * Polls, quizzes and suggestions, in memory.
 *
 * Every rule here has its twin in `supabase/polls-quizzes.sql` and a check in
 * `supabase/verify-polls-quizzes.sql`, and `rules.test.ts` holds this file to the same
 * answers. A refusal a person should read — "this poll has closed" — is a plain `Error` with
 * that sentence, the same as the database's SQLSTATE 45010; a refusal of somebody who should
 * never have been able to ask is a `NotAllowed`.
 */
export function createPlayMock({ now, latencyMs, households, NotAllowed }: Options): {
  api: Pick<ApiClient, 'polls' | 'quizzes' | 'suggestions'>
  /** One household's votes, scores and suggestions, as `viewer` may read them: the export's share. */
  exportFor: (householdId: string, viewer: Viewer) => Pick<HouseholdExport, 'votes' | 'quizScores' | 'suggestions'>
} {
  const data = buildPlayFixtures()
  const delay = <T,>(value: T): Promise<T> =>
    latencyMs <= 0 ? Promise.resolve(value) : new Promise((resolve) => setTimeout(() => resolve(value), latencyMs))
  const refuse = (message: string) => Promise.reject(new Error(message))
  /** When each household last voted in each poll. The samples have none, and fall back to the poll's opening. */
  const votedAt = new Map<string, string>()
  let counter = 0
  const nextId = (prefix: string) => `${prefix}-new-${(counter += 1)}`

  /** The household this viewer votes and plays as. Null for a visitor or a household-less admin. */
  const householdOf = (viewer: Viewer) => (viewer?.householdId && households.some((h) => h.id === viewer.householdId) ? viewer.householdId : null)
  const nameOf = (id: string) => households.find((h) => h.id === id)?.name ?? 'A household since erased'
  const opened = (item: { opensAt?: string }) => Boolean(item.opensAt) && Date.parse(item.opensAt!) <= now().getTime()

  // ---- polls ----------------------------------------------------------------

  const tallyOf = (poll: Poll) => {
    const tally = poll.options.map(() => 0)
    for (const option of Object.values(data.votes[poll.id] ?? {})) tally[option] += 1
    return tally
  }

  const viewOf = (poll: Poll, viewer: Viewer): PollView => {
    const household = householdOf(viewer)
    const myVote = household ? data.votes[poll.id]?.[household] : undefined
    const allowed = isAdmin(viewer) || canSeeResults(poll, myVote !== undefined, now())
    return {
      poll: { ...poll, options: [...poll.options] },
      ...(myVote !== undefined ? { myVote } : {}),
      ...(allowed ? { tally: tallyOf(poll) } : {}),
    }
  }

  const shapeOfPoll = (draft: PollDraft) => ({
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    options: filledOptions(draft.options),
    named: draft.named,
    results: draft.results,
    ...(draft.opensAt ? { opensAt: draft.opensAt } : {}),
    ...(draft.closesAt ? { closesAt: draft.closesAt } : {}),
  })

  // ---- quizzes --------------------------------------------------------------

  const findQuiz = (id: string) => data.quizzes.find((q) => q.id === id)
  const findQuestion = (id: string) => data.questions.find((q) => q.id === id)
  const quizPlayed = (id: string) => Object.keys(data.attempts[id] ?? {}).length > 0 || (data.publicPlays[id] ?? 0) > 0
  const questionPlayed = (id: string) => data.quizzes.some((quiz) => quiz.questionIds.includes(id) && quizPlayed(quiz.id))
  const asQuestion = ({ correct: _correct, locked: _locked, ...question }: BankQuestion): Question => ({
    ...question,
    options: [...question.options],
    tags: [...question.tags],
  })
  const asBank = (question: BankQuestion): BankQuestion => ({ ...question, ...asQuestion(question), locked: questionPlayed(question.id) })
  const copyQuiz = (quiz: Quiz): Quiz => ({ ...quiz, questionIds: [...quiz.questionIds] })

  /** Whether this viewer may see a quiz at all: the read policies on portal.quizzes. */
  const mayRead = (quiz: Quiz, viewer: Viewer) =>
    isAdmin(viewer) || (opened(quiz) && (quiz.audience === 'public' || householdOf(viewer) !== null))

  const shapeOfQuiz = (draft: QuizDraft) => ({
    title: draft.title.trim(),
    intro: draft.intro.trim(),
    audience: draft.audience,
    opensAt: draft.opensAt || undefined,
    closesAt: draft.closesAt || undefined,
    questionIds: [...draft.questionIds],
  })

  const shapeOfQuestion = (draft: QuestionDraft) => ({
    prompt: draft.prompt.trim(),
    options: draft.options.map((o) => o.trim()),
    correct: draft.correct,
    explanation: draft.explanation.trim(),
    tags: [...draft.tags],
    imageUrl: draft.imageUrl.trim() || undefined,
    creditedTo: draft.creditedTo.trim() || undefined,
  })

  const exportFor = (householdId: string, viewer: Viewer) => {
    // The same reach as the policies: a household reads all of its own votes, the committee
    // only those on a named poll.
    const own = viewer?.householdId === householdId
    return {
      votes: data.polls.flatMap((poll) => {
        const option = data.votes[poll.id]?.[householdId]
        if (option === undefined || !(own || poll.named)) return []
        return [{ poll: poll.title, choice: poll.options[option], votedAt: votedAt.get(`${poll.id}:${householdId}`) ?? poll.opensAt ?? poll.createdAt }]
      }),
      quizScores: data.quizzes.flatMap((quiz) => {
        const a = data.attempts[quiz.id]?.[householdId]
        return a ? [{ quiz: quiz.title, score: a.score, total: a.total, shownOnLeaderboard: a.showName, playedAt: a.playedAt }] : []
      }),
      suggestions: data.suggestions
        .filter((s) => s.householdId === householdId)
        .map((s) => ({ kind: s.kind, prompt: s.prompt, status: s.status, sentAt: s.createdAt })),
    }
  }

  return { exportFor, api: {
    polls: {
      list: (viewer) => {
        if (!householdOf(viewer) && !isAdmin(viewer)) return delay([])
        return delay(byState(data.polls.filter(opened), now()).map((poll) => viewOf(poll, viewer)))
      },

      vote: (pollId, option, viewer) => {
        const household = householdOf(viewer)
        if (!household) return Promise.reject(new NotAllowed('only members can vote'))
        const poll = data.polls.find((p) => p.id === pollId)
        if (!poll || !opened(poll)) return refuse('There is no such poll.')
        if (stateOf(poll, now()) === 'closed') return refuse('This poll has closed.')
        if (!Number.isInteger(option) || option < 0 || option >= poll.options.length) return refuse('That is not one of the choices.')
        data.votes[poll.id] = { ...(data.votes[poll.id] ?? {}), [household]: option }
        votedAt.set(`${poll.id}:${household}`, now().toISOString())
        return delay(viewOf(poll, viewer))
      },

      listAll: (viewer) => {
        if (!isAdmin(viewer)) return delay([])
        return delay(
          byState(data.polls, now()).map((poll) => ({
            poll: { ...poll, options: [...poll.options] },
            tally: tallyOf(poll),
            ...(poll.named
              ? {
                  voters: Object.entries(data.votes[poll.id] ?? {})
                    .map(([household, option]) => ({ household: nameOf(household), option }))
                    .sort((a, b) => a.option - b.option || a.household.localeCompare(b.household)),
                }
              : {}),
          })),
        )
      },

      create: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can make a poll'))
        if (!isValid(validatePoll(draft))) return refuse('Please check the poll and try again.')
        const poll: Poll = { id: nextId('poll'), ...shapeOfPoll(draft), createdAt: now().toISOString() }
        data.polls.push(poll)
        return delay({ ...poll })
      },

      update: (id, draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can change a poll'))
        const at = data.polls.findIndex((p) => p.id === id)
        if (at === -1) return Promise.reject(new NotAllowed('no such poll'))
        if (!isValid(validatePoll(draft))) return refuse('Please check the poll and try again.')
        const was = data.polls[at]
        const next = { ...shapeOfPoll(draft) }
        const voted = Object.keys(data.votes[id] ?? {}).length > 0
        if (voted && next.options.join('\n') !== was.options.join('\n')) {
          return refuse('People have already voted, so the choices cannot change.')
        }
        if (voted && next.named !== was.named) {
          return refuse('People have already voted, so whether the poll is named cannot change.')
        }
        // Replaced rather than edited, so an earlier reference held by the audit wrapper keeps
        // what it saw.
        data.polls[at] = { id, createdAt: was.createdAt, ...next }
        return delay({ ...data.polls[at] })
      },

      remove: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can delete a poll'))
        const at = data.polls.findIndex((p) => p.id === id)
        if (at === -1) return Promise.reject(new NotAllowed('no such poll'))
        data.polls.splice(at, 1)
        delete data.votes[id]
        return delay(undefined)
      },
    },

    quizzes: {
      list: (viewer) => {
        const household = householdOf(viewer)
        const visible = data.quizzes.filter((quiz) => opened(quiz) && mayRead(quiz, viewer))
        return delay(
          byState(visible, now()).map((quiz) => {
            const mine = household ? data.attempts[quiz.id]?.[household] : undefined
            return {
              quiz: copyQuiz(quiz),
              questionCount: quiz.questionIds.length,
              ...(mine ? { played: { score: mine.score, total: mine.total } } : {}),
            }
          }),
        )
      },

      get: (id, viewer) => {
        const quiz = findQuiz(id)
        if (!quiz || !mayRead(quiz, viewer)) return delay(null)
        const questions = quiz.questionIds.map(findQuestion).filter((q): q is BankQuestion => Boolean(q)).map(asQuestion)
        return delay({ quiz: copyQuiz(quiz), questions })
      },

      submit: (id, answers, showName, viewer) => {
        const quiz = findQuiz(id)
        if (!quiz || !opened(quiz)) return refuse('There is no such quiz.')
        if (stateOf(quiz, now()) === 'closed') return refuse('This quiz has closed.')
        const household = householdOf(viewer)
        if (quiz.audience === 'members' && !household) return Promise.reject(new NotAllowed('this quiz is for members'))
        const questions = quiz.questionIds.map(findQuestion).filter((q): q is BankQuestion => Boolean(q))
        const correct = questions.map((q) => q.correct)
        const score = mark(answers, correct)
        if (household) {
          if (data.attempts[id]?.[household]) return refuse('Your household has already played this quiz.')
          data.attempts[id] = {
            ...(data.attempts[id] ?? {}),
            [household]: { score, total: correct.length, answers: [...answers], showName, playedAt: now().toISOString() },
          }
        } else {
          data.publicPlays[id] = (data.publicPlays[id] ?? 0) + 1
        }
        return delay({ score, total: correct.length, correct, explanations: questions.map((q) => q.explanation) })
      },

      leaderboard: (id, viewer) => {
        if (!householdOf(viewer) && !isAdmin(viewer)) return delay([])
        return delay(
          Object.entries(data.attempts[id] ?? {})
            .sort(([, a], [, b]) => b.score - a.score || a.playedAt.localeCompare(b.playedAt))
            .map(([household, a]) => ({ ...(a.showName ? { household: nameOf(household) } : {}), score: a.score, total: a.total })),
        )
      },

      listAll: (viewer) => {
        if (!isAdmin(viewer)) return delay([])
        return delay(
          byState(data.quizzes, now()).map((quiz) => ({
            quiz: copyQuiz(quiz),
            memberPlays: Object.keys(data.attempts[quiz.id] ?? {}).length,
            publicPlays: data.publicPlays[quiz.id] ?? 0,
            locked: quizPlayed(quiz.id),
          })),
        )
      },

      create: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can make a quiz'))
        if (!isValid(validateQuiz(draft))) return refuse('Please check the quiz and try again.')
        if (draft.questionIds.some((q) => !findQuestion(q))) return refuse('One of those questions is no longer in the bank.')
        const quiz: Quiz = { id: nextId('quiz'), ...shapeOfQuiz(draft), createdAt: now().toISOString() }
        data.quizzes.push(quiz)
        return delay(copyQuiz(quiz))
      },

      update: (id, draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can change a quiz'))
        const at = data.quizzes.findIndex((q) => q.id === id)
        if (at === -1) return Promise.reject(new NotAllowed('no such quiz'))
        if (!isValid(validateQuiz(draft))) return refuse('Please check the quiz and try again.')
        const was = data.quizzes[at]
        if (draft.questionIds.join() !== was.questionIds.join() && quizPlayed(id)) {
          return refuse('People have already played this quiz, so its questions cannot change. Make a copy instead.')
        }
        if (draft.questionIds.some((q) => !findQuestion(q))) return refuse('One of those questions is no longer in the bank.')
        data.quizzes[at] = { id, createdAt: was.createdAt, ...shapeOfQuiz(draft) }
        return delay(copyQuiz(data.quizzes[at]))
      },

      remove: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can delete a quiz'))
        const at = data.quizzes.findIndex((q) => q.id === id)
        if (at === -1) return Promise.reject(new NotAllowed('no such quiz'))
        data.quizzes.splice(at, 1)
        delete data.attempts[id]
        delete data.publicPlays[id]
        return delay(undefined)
      },

      attempts: (id, viewer) => {
        if (!isAdmin(viewer)) return delay([])
        return delay(
          Object.entries(data.attempts[id] ?? {})
            .map(([household, a]) => ({ household: nameOf(household), score: a.score, total: a.total, showName: a.showName, playedAt: a.playedAt }))
            .sort((a, b) => b.score - a.score || a.playedAt.localeCompare(b.playedAt)),
        )
      },

      bank: (viewer) => delay(isAdmin(viewer) ? data.questions.map(asBank) : []),

      createQuestion: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can write a question'))
        if (!isValid(validateQuestion(draft))) return refuse('Please check the question and try again.')
        const question: BankQuestion = { id: nextId('q'), ...shapeOfQuestion(draft), locked: false }
        data.questions.push(question)
        return delay(asBank(question))
      },

      updateQuestion: (id, draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can change a question'))
        const at = data.questions.findIndex((q) => q.id === id)
        if (at === -1) return Promise.reject(new NotAllowed('no such question'))
        if (!isValid(validateQuestion(draft))) return refuse('Please check the question and try again.')
        const was = data.questions[at]
        const next = shapeOfQuestion(draft)
        const reworded = next.prompt !== was.prompt || next.options.join('\n') !== was.options.join('\n') || next.correct !== was.correct
        if (reworded && questionPlayed(id)) {
          return refuse('People have already answered this question in a quiz, so it cannot change. Write a new one instead.')
        }
        data.questions[at] = { id, ...next, locked: false }
        return delay(asBank(data.questions[at]))
      },

      removeQuestion: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can delete a question'))
        const at = data.questions.findIndex((q) => q.id === id)
        if (at === -1) return Promise.reject(new NotAllowed('no such question'))
        if (data.quizzes.some((quiz) => quiz.questionIds.includes(id))) {
          return refuse('This question is in a quiz. Take it out of the quiz first.')
        }
        data.questions.splice(at, 1)
        return delay(undefined)
      },
    },

    suggestions: {
      send: (draft, viewer) => {
        const household = householdOf(viewer)
        if (!household) return Promise.reject(new NotAllowed('only members can make a suggestion'))
        if (!isValid(validateSuggestion(draft))) return refuse('Please check the suggestion and try again.')
        // Waiting, and theirs, whatever the draft said — the stamp trigger's job in the database.
        const suggestion: Suggestion = {
          id: nextId('sg'),
          ...tidySuggestion(draft),
          householdId: household,
          status: 'pending',
          createdAt: now().toISOString(),
        }
        data.suggestions.push(suggestion)
        return delay({ ...suggestion })
      },

      listMine: (viewer) => {
        const household = householdOf(viewer)
        if (!household) return delay([])
        return delay(
          data.suggestions
            .filter((s) => s.householdId === household)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((s) => ({ ...s })),
        )
      },

      listAll: (viewer) => {
        if (!isAdmin(viewer)) return delay([])
        return delay(suggestionsForReview(data.suggestions).map((s) => ({ ...s, household: nameOf(s.householdId) })))
      },

      review: (id, status, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can review a suggestion'))
        const at = data.suggestions.findIndex((s) => s.id === id)
        if (at === -1) return Promise.reject(new NotAllowed('no such suggestion'))
        const was = data.suggestions[at]
        data.suggestions[at] =
          status === 'pending'
            ? { ...was, status, reviewedBy: undefined, reviewedAt: undefined }
            : {
                ...was,
                status,
                reviewedBy: households.find((h) => h.id === viewer.householdId)?.name ?? 'The committee',
                reviewedAt: now().toISOString(),
              }
        return delay({ ...data.suggestions[at], household: nameOf(was.householdId) })
      },

      remove: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const at = data.suggestions.findIndex((s) => s.id === id)
        if (at === -1) return Promise.reject(new NotAllowed('no such suggestion'))
        data.suggestions.splice(at, 1)
        return delay(undefined)
      },
    },
  } }
}
