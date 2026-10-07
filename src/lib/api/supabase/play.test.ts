import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Viewer } from '@/domain/household'
import { playMethods, refuse, toPoll, toQuiz, toSuggestion } from './play'

type Failure = { code: string; message: string }

/**
 * A stand-in for PostgREST that records what was asked of it, tables and functions both.
 * Answers are keyed by table or by `rpc:name`; a failure under the same key is returned instead.
 */
function fakeClient(answers: Record<string, unknown> = {}, errors: Record<string, Failure> = {}) {
  const calls: string[] = []
  const shown = (a: unknown) => (typeof a === 'string' ? a : Array.isArray(a) ? a.join('|') : a === null ? 'null' : '…')
  const chain = (table: string): Record<string, unknown> => {
    const self: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'lte', 'not', 'order', 'insert', 'update', 'delete', 'limit']) {
      self[method] = (...args: unknown[]) => {
        calls.push(`${table}.${method}(${args.map(shown).join(',')})`)
        return self
      }
    }
    const failure = errors[table] ?? null
    self.maybeSingle = async () => ({ data: failure ? null : (answers[table] ?? null), error: failure })
    self.single = async () => ({ data: failure ? null : (answers[table] ?? null), error: failure })
    self.then = (resolve: (v: unknown) => unknown) => resolve({ data: failure ? [] : (answers[table] ?? []), error: failure })
    return self
  }
  const rpc = async (name: string, args: Record<string, unknown>) => {
    calls.push(`rpc:${name}(${Object.entries(args).map(([k, v]) => `${k}=${shown(v)}`).join(',')})`)
    const failure = errors[`rpc:${name}`] ?? null
    const answer = answers[`rpc:${name}`]
    return { data: failure ? null : typeof answer === 'function' ? answer(args) : (answer ?? null), error: failure }
  }
  return {
    calls,
    client: { schema: () => ({ from: (table: string) => chain(table), rpc }) } as unknown as SupabaseClient,
  }
}

const NOW = new Date('2026-09-16T10:00:00.000Z')
function api(answers: Record<string, unknown> = {}, errors: Record<string, Failure> = {}) {
  const { client, calls } = fakeClient(answers, errors)
  return { calls, ...playMethods(async () => client, () => NOW) }
}

const member: Viewer = { householdId: 'hh-1', role: 'member' }
const admin: Viewer = { householdId: 'hh-2', role: 'admin' }

const pollRow = (over: Record<string, unknown> = {}) => ({
  id: 'p-1',
  title: 'Which Sunday?',
  detail: '',
  options: ['A', 'B'],
  named: false,
  results: 'after_vote',
  opens_at: '2026-09-01T09:00:00Z',
  closes_at: null,
  created_at: '2026-08-31T09:00:00Z',
  ...over,
}) as Parameters<typeof toPoll>[0]

const quizRow = (over: Record<string, unknown> = {}) => ({
  id: 'z-1',
  title: 'Durga Puja',
  intro: '',
  audience: 'public',
  opens_at: '2026-09-01T09:00:00Z',
  closes_at: null,
  created_at: '2026-08-31T09:00:00Z',
  quiz_items: [
    { question_id: 'q-2', position: 1 },
    { question_id: 'q-1', position: 0 },
  ],
  ...over,
}) as Parameters<typeof toQuiz>[0]

const questionRow = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  prompt: `Question ${id}?`,
  options: ['A', 'B'],
  image_url: null,
  explanation: '',
  tags: null,
  credited_to: null,
  ...over,
})

const suggestionRow = (over: Record<string, unknown> = {}) => ({
  id: 's-1',
  kind: 'question',
  prompt: 'Which river?',
  options: ['Hooghly', 'Padma'],
  answer: 0,
  note: '',
  credit: true,
  household_id: 'hh-1',
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-09-01T09:00:00Z',
  ...over,
}) as Parameters<typeof toSuggestion>[0]

describe('the rows', () => {
  it('turn nulls into absent fields', () => {
    expect(toPoll(pollRow())).not.toHaveProperty('closesAt')
    expect(toPoll(pollRow({ opens_at: null }))).not.toHaveProperty('opensAt')
    expect(toPoll(pollRow({ closes_at: '2026-10-01T09:00:00Z' })).closesAt).toBe('2026-10-01T09:00:00Z')
    expect(toQuiz(quizRow({ opens_at: null, closes_at: '2026-10-01T09:00:00Z', quiz_items: null }))).toMatchObject({ questionIds: [], closesAt: '2026-10-01T09:00:00Z' })
    expect(toSuggestion(suggestionRow({ answer: null, households: [{ name: 'The Sens' }], reviewed_by: 'X', reviewed_at: '2026-09-02' }))).toMatchObject({
      household: 'The Sens',
      reviewedBy: 'X',
    })
    expect(toSuggestion(suggestionRow({ answer: null }))).not.toHaveProperty('answer')
  })

  it('put a quiz’s questions in their order', () => {
    expect(toQuiz(quizRow()).questionIds).toEqual(['q-1', 'q-2'])
  })
})

describe('what the database says, in words', () => {
  it('shows a sentence meant for a person as it is', () => {
    expect(() => refuse('x', { code: '45010', message: 'This poll has closed.' })).toThrow(/^This poll has closed\.$/)
  })

  it('refuses somebody who could never have asked', () => {
    expect(() => refuse('only members can vote', { code: '42501', message: 'permission denied' })).toThrow('Not allowed: only members can vote')
  })

  it('explains a question still in a quiz', () => {
    expect(() => refuse('x', { code: '23503', message: 'fk' })).toThrow(/Take it out of the quiz first/)
  })

  it('passes anything else through', () => {
    expect(() => refuse('fallback', { code: 'XX', message: 'odd' })).toThrow('odd')
    expect(() => refuse('fallback', null)).toThrow('fallback')
  })
})

describe('polls', () => {
  it('ask nothing for a visitor', async () => {
    const { polls, calls } = api()
    expect(await polls.list(null)).toEqual([])
    expect(calls).toEqual([])
  })

  it('list opened polls with the household’s own vote and whatever totals the database allows', async () => {
    const { polls, calls } = api({
      polls: [pollRow(), pollRow({ id: 'p-2' })],
      poll_votes: [{ poll_id: 'p-1', option: 1 }],
      'rpc:poll_results': (args: { p_poll: string }) => (args.p_poll === 'p-1' ? [{ option: 1, votes: 4 }, { option: 0, votes: 2 }] : []),
    })
    const views = await polls.list(member)
    expect(views.find((v) => v.poll.id === 'p-1')).toMatchObject({ myVote: 1, tally: [2, 4] })
    expect(views.find((v) => v.poll.id === 'p-2')).not.toHaveProperty('tally')
    expect(calls).toContain('polls.not(opens_at,is,null)')
    expect(calls).toContain('poll_votes.eq(household_id,hh-1)')
  })

  it('say the polls could not be read, rather than that there are none, when the read fails', async () => {
    await expect(api({}, { polls: { code: '', message: 'fetch failed' } }).polls.list(member)).rejects.toThrow('The polls could not be read: fetch failed')
    await expect(api({}, { polls: { code: '', message: 'fetch failed' } }).polls.listAll(admin)).rejects.toThrow('The polls could not be read: fetch failed')
  })

  it('fail the list when the household’s own votes cannot be read, rather than offering a second vote', async () => {
    const { polls } = api({ polls: [pollRow()] }, { poll_votes: { code: '', message: 'fetch failed' } })
    await expect(polls.list(member)).rejects.toThrow('Your votes could not be read: fetch failed')
  })

  it('fail when the totals cannot be read, which is not the same as totals kept back', async () => {
    const { polls } = api({ polls: [pollRow()] }, { 'rpc:poll_results': { code: '', message: 'fetch failed' } })
    await expect(polls.list(member)).rejects.toThrow("The poll's results could not be read: fetch failed")
  })

  it('still answer an empty list when no poll has opened', async () => {
    expect(await api().polls.list(member)).toEqual([])
    expect(await api().polls.listAll(admin)).toEqual([])
  })

  it('do not look up a vote for an admin with no household', async () => {
    const { polls, calls } = api({ polls: [pollRow()] })
    await polls.list({ householdId: '', role: 'admin' })
    expect(calls.some((c) => c.startsWith('poll_votes'))).toBe(false)
  })

  it('vote through the function, then read the poll back', async () => {
    const { polls, calls } = api({ polls: pollRow(), poll_votes: [{ poll_id: 'p-1', option: 0 }], 'rpc:poll_results': [{ option: 0, votes: 1 }, { option: 1, votes: 0 }] })
    const view = await polls.vote('p-1', 0, member)
    expect(calls[0]).toBe('rpc:cast_vote(p_poll=p-1,p_option=…)')
    expect(view).toMatchObject({ myVote: 0, tally: [1, 0] })
  })

  it('pass on the reason a vote was refused', async () => {
    const { polls } = api({}, { 'rpc:cast_vote': { code: '45010', message: 'This poll has closed.' } })
    await expect(polls.vote('p-1', 0, member)).rejects.toThrow('This poll has closed.')
  })

  it('say so when the poll has gone', async () => {
    const { polls } = api({ polls: null })
    await expect(polls.vote('p-1', 0, member)).rejects.toThrow(/no such poll/)
  })

  it('give the committee totals, and names only on a named poll', async () => {
    const { polls, calls } = api({
      polls: [pollRow(), pollRow({ id: 'p-n', named: true })],
      poll_votes: [
        { poll_id: 'p-n', option: 1, households: { name: 'The Sens' } },
        { poll_id: 'p-n', option: 0, households: [{ name: 'The Roys' }] },
        { poll_id: 'p-n', option: 0, households: null },
      ],
    })
    expect(await polls.listAll(member)).toEqual([])
    const all = await polls.listAll(admin)
    expect(all.find((s) => s.poll.id === 'p-1')).toMatchObject({ tally: [0, 0] })
    expect(all.find((s) => s.poll.id === 'p-1')).not.toHaveProperty('voters')
    expect(all.find((s) => s.poll.id === 'p-n')!.voters).toEqual([
      { household: 'A household', option: 0 },
      { household: 'The Roys', option: 0 },
      { household: 'The Sens', option: 1 },
    ])
    expect(calls).toContain('poll_votes.in(poll_id,p-n)')
  })

  it('save a draft with empty dates as nulls and blank choices dropped', async () => {
    const { polls, calls } = api({ polls: pollRow() })
    await polls.create({ title: 'Tea?', detail: '', options: ['Tea', '', 'Coffee'], named: false, results: 'after_vote', opensAt: '', closesAt: '' }, admin)
    expect(calls).toContain('polls.insert(…)')
    await expect(polls.create({ title: '', detail: '', options: [], named: false, results: 'after_vote', opensAt: '', closesAt: '' }, admin)).rejects.toThrow(/check the poll/)
  })

  it('refuse writes the way the database does', async () => {
    const locked = api({}, { polls: { code: '45010', message: 'People have already voted, so the choices cannot change.' } })
    const draft = { title: 'Tea?', detail: '', options: ['Tea', 'Coffee'], named: false, results: 'after_vote' as const, opensAt: '', closesAt: '' }
    await expect(locked.polls.update('p-1', draft, admin)).rejects.toThrow(/choices cannot change/)
    await expect(locked.polls.create(draft, admin)).rejects.toThrow(/choices cannot change/)
    await expect(locked.polls.remove('p-1', admin)).rejects.toThrow(/choices cannot change/)
    const empty = api({ polls: null })
    await expect(empty.polls.update('p-1', draft, admin)).rejects.toThrow(/no such poll/)
    await expect(empty.polls.remove('p-1', admin)).rejects.toThrow(/no such poll/)
    await expect(empty.polls.update('p-1', { ...draft, options: [] }, admin)).rejects.toThrow(/check the poll/)
    expect(await api({ polls: pollRow() }).polls.update('p-1', draft, admin)).toMatchObject({ id: 'p-1' })
    await api({ polls: { id: 'p-1' } }).polls.remove('p-1', admin)
  })
})

describe('quizzes', () => {
  it('list what the viewer may see, with their household’s score', async () => {
    const { quizzes, calls } = api({ quizzes: [quizRow(), quizRow({ id: 'z-2' })], quiz_attempts: [{ quiz_id: 'z-1', score: 1, total: 2 }] })
    const cards = await quizzes.list(member)
    expect(cards.find((c) => c.quiz.id === 'z-1')).toMatchObject({ questionCount: 2, played: { score: 1, total: 2 } })
    expect(cards.find((c) => c.quiz.id === 'z-2')).not.toHaveProperty('played')
    expect(calls).toContain('quiz_attempts.eq(household_id,hh-1)')
  })

  it('say the quizzes could not be read, rather than that there are none, when the read fails', async () => {
    await expect(api({}, { quizzes: { code: '', message: 'fetch failed' } }).quizzes.list(null)).rejects.toThrow('The quizzes could not be read: fetch failed')
    await expect(api({}, { quizzes: { code: '', message: 'fetch failed' } }).quizzes.get('z-1', null)).rejects.toThrow('The quiz could not be read: fetch failed')
    await expect(api({}, { 'rpc:quiz_leaderboard': { code: '', message: 'fetch failed' } }).quizzes.leaderboard('z-1', member)).rejects.toThrow(
      'The scores could not be read: fetch failed',
    )
  })

  it('fail the committee’s list and the bank when the plays cannot be read, rather than unlocking what was played', async () => {
    const broken = api({ quizzes: [quizRow()] }, { quiz_attempts: { code: '', message: 'fetch failed' } })
    await expect(broken.quizzes.listAll(admin)).rejects.toThrow("The quizzes' plays could not be read: fetch failed")
    await expect(broken.quizzes.bank(admin)).rejects.toThrow("The quizzes' plays could not be read: fetch failed")
  })

  it('still answer an empty list when no quiz has opened', async () => {
    expect(await api().quizzes.list(member)).toEqual([])
    expect(await api().quizzes.listAll(admin)).toEqual([])
  })

  it('ask a visitor’s list nothing about attempts', async () => {
    const { quizzes, calls } = api({ quizzes: [quizRow()] })
    await quizzes.list(null)
    expect(calls.some((c) => c.startsWith('quiz_attempts'))).toBe(false)
  })

  it('get a quiz’s questions in order, and nothing when it is not theirs', async () => {
    const row = quizRow({
      quiz_items: [
        { question_id: 'q-2', position: 1, quiz_questions: questionRow('q-2', { image_url: 'https://x/y.jpg', credited_to: 'The Sens', tags: ['t'] }) },
        { question_id: 'q-1', position: 0, quiz_questions: [questionRow('q-1')] },
        { question_id: 'q-3', position: 2, quiz_questions: null },
      ],
    })
    const quiz = await api({ quizzes: row }).quizzes.get('z-1', null)
    expect(quiz!.questions.map((q) => q.id)).toEqual(['q-1', 'q-2'])
    expect(quiz!.questions[1]).toMatchObject({ imageUrl: 'https://x/y.jpg', creditedTo: 'The Sens', tags: ['t'] })
    expect(await api({ quizzes: null }).quizzes.get('z-1', null)).toBeNull()
  })

  it('are marked by the database', async () => {
    const { quizzes, calls } = api({ 'rpc:submit_quiz': [{ score: 1, total: 2, correct: [0, 1], explanations: ['', ''] }] })
    expect(await quizzes.submit('z-1', [0, 0], false, member)).toEqual({ score: 1, total: 2, correct: [0, 1], explanations: ['', ''] })
    expect(calls[0]).toBe('rpc:submit_quiz(p_quiz=z-1,p_answers=0|0,p_show_name=…)')
  })

  it('say why a play was refused, and when nothing came back', async () => {
    await expect(api({}, { 'rpc:submit_quiz': { code: '45010', message: 'Your household has already played this quiz.' } }).quizzes.submit('z-1', [], true, member)).rejects.toThrow(
      'Your household has already played this quiz.',
    )
    await expect(api({ 'rpc:submit_quiz': [] }).quizzes.submit('z-1', [], true, member)).rejects.toThrow(/could not be marked/)
    expect(await api({ 'rpc:submit_quiz': { score: 0, total: 0, correct: null, explanations: null } }).quizzes.submit('z-1', [], true, null)).toEqual({
      score: 0,
      total: 0,
      correct: [],
      explanations: [],
    })
  })

  it('show a leaderboard to members only, without the names of those who asked', async () => {
    const { quizzes, calls } = api({ 'rpc:quiz_leaderboard': [{ household: 'The Sens', score: 2, total: 2 }, { household: null, score: 1, total: 2 }] })
    expect(await quizzes.leaderboard('z-1', null)).toEqual([])
    expect(calls).toEqual([])
    expect(await quizzes.leaderboard('z-1', member)).toEqual([{ household: 'The Sens', score: 2, total: 2 }, { score: 1, total: 2 }])
  })

  it('count plays for the committee, members and visitors apart', async () => {
    const { quizzes } = api({
      quizzes: [quizRow(), quizRow({ id: 'z-2', opens_at: null })],
      quiz_attempts: [{ quiz_id: 'z-1' }, { quiz_id: 'z-1' }],
      quiz_public_plays: [{ quiz_id: 'z-1', plays: 5 }],
    })
    expect(await quizzes.listAll(member)).toEqual([])
    const all = await quizzes.listAll(admin)
    expect(all.find((s) => s.quiz.id === 'z-1')).toMatchObject({ memberPlays: 2, publicPlays: 5, locked: true })
    expect(all.find((s) => s.quiz.id === 'z-2')).toMatchObject({ memberPlays: 0, publicPlays: 0, locked: false })
  })

  it('save a quiz and its questions in one call', async () => {
    const draft = { title: 'Durga Puja', intro: '', audience: 'public' as const, opensAt: '', closesAt: '', questionIds: ['q-1'] }
    const { quizzes, calls } = api({ 'rpc:save_quiz': 'z-1', quizzes: quizRow() })
    expect((await quizzes.create(draft, admin)).id).toBe('z-1')
    expect(calls[0]).toBe('rpc:save_quiz(p_id=null,p_title=Durga Puja,p_intro=,p_audience=public,p_opens_at=null,p_closes_at=null,p_questions=q-1)')
    expect((await quizzes.update('z-1', draft, admin)).id).toBe('z-1')
    await expect(quizzes.create({ ...draft, title: '' }, admin)).rejects.toThrow(/check the quiz/)
    await expect(quizzes.update('z-1', { ...draft, title: '' }, admin)).rejects.toThrow(/check the quiz/)
    const locked = api({}, { 'rpc:save_quiz': { code: '45010', message: 'Make a copy instead.' } })
    await expect(locked.quizzes.update('z-1', draft, admin)).rejects.toThrow('Make a copy instead.')
    await expect(locked.quizzes.create(draft, admin)).rejects.toThrow('Make a copy instead.')
    await expect(api({ 'rpc:save_quiz': 'z-1', quizzes: null }).quizzes.create(draft, admin)).rejects.toThrow(/no such quiz/)
  })

  it('delete a quiz, or say it was not there', async () => {
    await api({ quizzes: { id: 'z-1' } }).quizzes.remove('z-1', admin)
    await expect(api({ quizzes: null }).quizzes.remove('z-1', admin)).rejects.toThrow(/no such quiz/)
    await expect(api({}, { quizzes: { code: '42501', message: 'no' } }).quizzes.remove('z-1', admin)).rejects.toThrow(/committee/)
  })

  it('list each household’s play for the committee', async () => {
    const { quizzes } = api({
      quiz_attempts: [
        { score: 2, total: 2, show_name: true, played_at: '2026-09-02', households: { name: 'The Sens' } },
        { score: 1, total: 2, show_name: false, played_at: '2026-09-03', households: null },
      ],
    })
    expect(await quizzes.attempts('z-1', member)).toEqual([])
    expect((await quizzes.attempts('z-1', admin)).map((a) => a.household)).toEqual(['The Sens', 'A household since erased'])
  })

  it('read the bank with answers, locking what has been played', async () => {
    const answers = {
      quiz_questions: [
        { ...questionRow('q-1'), quiz_answers: { correct: 1 } },
        { ...questionRow('q-2'), quiz_answers: [{ correct: 0 }] },
        { ...questionRow('q-3'), quiz_answers: null },
      ],
      quiz_items: [{ quiz_id: 'z-1', question_id: 'q-1' }, { quiz_id: 'z-2', question_id: 'q-2' }],
      quiz_attempts: [{ quiz_id: 'z-1' }],
      quiz_public_plays: [{ quiz_id: 'z-2', plays: 0 }],
    }
    const { quizzes } = api(answers)
    expect(await quizzes.bank(member)).toEqual([])
    const bank = await quizzes.bank(admin)
    expect(bank.map((q) => [q.id, q.correct, q.locked])).toEqual([
      ['q-1', 1, true],
      ['q-2', 0, false],
      ['q-3', 0, false],
    ])
  })

  it('save a question with its answer in one call, and read it back', async () => {
    const draft = { prompt: 'Two plus two?', options: ['3', '4'], correct: 1, explanation: '', tags: [], imageUrl: '', creditedTo: '' }
    const answers = { 'rpc:save_question': 'q-9', quiz_questions: [{ ...questionRow('q-9'), quiz_answers: { correct: 1 } }] }
    const { quizzes, calls } = api(answers)
    expect((await quizzes.createQuestion(draft, admin)).id).toBe('q-9')
    expect(calls[0]).toMatch(/^rpc:save_question\(p_id=null,p_prompt=Two plus two\?/)
    expect((await quizzes.updateQuestion('q-9', draft, admin)).correct).toBe(1)
    await expect(quizzes.createQuestion({ ...draft, prompt: '' }, admin)).rejects.toThrow(/check the question/)
    await expect(quizzes.updateQuestion('q-9', { ...draft, prompt: '' }, admin)).rejects.toThrow(/check the question/)
    await expect(api({ 'rpc:save_question': 'q-9' }).quizzes.createQuestion(draft, admin)).rejects.toThrow(/no such question/)
    await expect(api({}).quizzes.updateQuestion('q-9', draft, admin)).rejects.toThrow(/no such question/)
    await expect(api({}, { 'rpc:save_question': { code: '45010', message: 'Write a new one instead.' } }).quizzes.updateQuestion('q-9', draft, admin)).rejects.toThrow(
      'Write a new one instead.',
    )
    await expect(api({}, { 'rpc:save_question': { code: '42501', message: 'no' } }).quizzes.createQuestion(draft, admin)).rejects.toThrow(/committee/)
  })

  it('delete a question, or say why not', async () => {
    await api({ quiz_questions: { id: 'q-1' } }).quizzes.removeQuestion('q-1', admin)
    await expect(api({ quiz_questions: null }).quizzes.removeQuestion('q-1', admin)).rejects.toThrow(/no such question/)
    await expect(api({}, { quiz_questions: { code: '23503', message: 'fk' } }).quizzes.removeQuestion('q-1', admin)).rejects.toThrow(/Take it out of the quiz first/)
  })
})

describe('suggestions', () => {
  const idea = { kind: 'poll' as const, prompt: 'Film night?', options: ['Yes', 'No'], note: '', credit: false }

  it('are sent with only the fields a member decides, and read back', async () => {
    const { suggestions, calls } = api({ suggestions: suggestionRow({ kind: 'poll', answer: null }) })
    expect((await suggestions.send(idea, member)).status).toBe('pending')
    expect(calls).toContain('suggestions.insert(…)')
    await expect(suggestions.send({ ...idea, options: [] }, member)).rejects.toThrow(/check the suggestion/)
    await expect(api({}, { suggestions: { code: '42501', message: 'no' } }).suggestions.send(idea, member)).rejects.toThrow(/members/)
  })

  it('list a household’s own, and nothing for somebody with no household', async () => {
    const { suggestions, calls } = api({ suggestions: [suggestionRow()] })
    expect(await suggestions.listMine(null)).toEqual([])
    expect(await suggestions.listMine(member)).toHaveLength(1)
    expect(calls).toContain('suggestions.eq(household_id,hh-1)')
  })

  it('say the suggestions could not be read, rather than that there are none, when the read fails', async () => {
    await expect(api({}, { suggestions: { code: '', message: 'fetch failed' } }).suggestions.listMine(member)).rejects.toThrow(
      'Your suggestions could not be read: fetch failed',
    )
    await expect(api({}, { suggestions: { code: '', message: 'fetch failed' } }).suggestions.listAll(admin)).rejects.toThrow(
      'The suggestions could not be read: fetch failed',
    )
  })

  it('give the committee the queue, waiting first', async () => {
    const { suggestions } = api({ suggestions: [suggestionRow({ id: 'old', status: 'approved', reviewed_by: 'X', reviewed_at: '2026-09-02' }), suggestionRow({ id: 'new' })] })
    expect(await suggestions.listAll(member)).toEqual([])
    expect((await suggestions.listAll(admin)).map((s) => s.id)).toEqual(['new', 'old'])
  })

  it('are reviewed by name, and put back with the decision cleared', async () => {
    const { suggestions, calls } = api({ households: { name: 'The Chatterjees' }, suggestions: suggestionRow({ status: 'approved' }) })
    await suggestions.review('s-1', 'approved', admin)
    expect(calls).toContain('households.eq(id,hh-2)')
    await suggestions.review('s-1', 'pending', admin)
    expect(calls.filter((c) => c.startsWith('households'))).toHaveLength(2)
    const nameless = api({ suggestions: suggestionRow({ status: 'rejected' }) })
    expect((await nameless.suggestions.review('s-1', 'rejected', admin)).status).toBe('rejected')
    await expect(api({ suggestions: null }).suggestions.review('s-1', 'approved', admin)).rejects.toThrow(/no such suggestion/)
    await expect(api({}, { suggestions: { code: '42501', message: 'no' } }).suggestions.review('s-1', 'approved', member)).rejects.toThrow(/committee/)
  })

  it('are deleted, or said not to be there', async () => {
    await api({ suggestions: { id: 's-1' } }).suggestions.remove('s-1', admin)
    await expect(api({ suggestions: null }).suggestions.remove('s-1', admin)).rejects.toThrow(/no such suggestion/)
    await expect(api({}, { suggestions: { code: '42501', message: 'no' } }).suggestions.remove('s-1', admin)).rejects.toThrow(/committee/)
  })
})
