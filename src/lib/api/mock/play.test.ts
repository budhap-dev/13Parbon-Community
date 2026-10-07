import { describe, expect, it } from 'vitest'
import type { Viewer } from '@/domain/household'
import { createMockApi } from '.'

/**
 * The poll and quiz rules, held to the same answers as `supabase/verify-polls-quizzes.sql`.
 * Block for block where the two overlap: the mock must never be more generous than the database.
 */
const now = () => new Date('2026-09-03T10:00:00Z')
const api = () => createMockApi({ now })

const visitor: Viewer = null
const sen: Viewer = { householdId: 'hh-sen', role: 'member' }
const roy: Viewer = { householdId: 'hh-roy', role: 'member' }
const admin: Viewer = { householdId: 'hh-chatterjee', role: 'admin' }
/** An allowlisted address with no household yet: the committee, but nobody to vote as. */
const householdless: Viewer = { householdId: '', role: 'admin' }

const pollDraft = { title: 'Tea or coffee?', detail: '', options: ['Tea', 'Coffee'], named: false, results: 'after_vote' as const, opensAt: '', closesAt: '' }
const questionDraft = { prompt: 'Two plus two?', options: ['3', '4'], correct: 1, explanation: '', tags: [], imageUrl: '', creditedTo: '' }

describe('polls, for a visitor', () => {
  it('shows nothing and takes no vote', async () => {
    const a = api()
    expect(await a.polls.list(visitor)).toEqual([])
    await expect(a.polls.vote('poll-picnic', 0, visitor)).rejects.toThrow(/members/)
  })
})

describe('polls, for a member', () => {
  it('lists every opened poll and never a draft', async () => {
    const ids = (await api().polls.list(sen)).map((v) => v.poll.id)
    expect(ids).toContain('poll-time')
    expect(ids).not.toContain('poll-draft')
    // Open ones first.
    expect(ids.at(-1)).toBe('poll-time')
  })

  it('shows no totals before voting, then shows them', async () => {
    const a = api()
    const before = (await a.polls.list(sen)).find((v) => v.poll.id === 'poll-picnic')!
    expect(before.tally).toBeUndefined()
    const after = await a.polls.vote('poll-picnic', 0, sen)
    expect(after.myVote).toBe(0)
    expect(after.tally).toEqual([2, 2, 1])
  })

  it('replaces a vote rather than adding one', async () => {
    const a = api()
    await a.polls.vote('poll-picnic', 0, sen)
    const view = await a.polls.vote('poll-picnic', 2, sen)
    expect(view.tally!.reduce((sum, n) => sum + n, 0)).toBe(5)
    expect(view.myVote).toBe(2)
  })

  it('keeps after-close and committee-only totals hidden, voted or not', async () => {
    const a = api()
    expect((await a.polls.vote('poll-bhog', 0, sen)).tally).toBeUndefined()
    expect((await a.polls.vote('poll-setup', 0, sen)).tally).toBeUndefined()
  })

  it('shows a closed poll’s totals and takes no more votes', async () => {
    const a = api()
    const closed = (await a.polls.list(roy)).find((v) => v.poll.id === 'poll-time')!
    expect(closed.tally).toEqual([3, 1, 0])
    await expect(a.polls.vote('poll-time', 0, roy)).rejects.toThrow('This poll has closed.')
  })

  it('refuses a draft, a missing poll and a choice that is not there', async () => {
    const a = api()
    await expect(a.polls.vote('poll-draft', 0, sen)).rejects.toThrow('There is no such poll.')
    await expect(a.polls.vote('nope', 0, sen)).rejects.toThrow('There is no such poll.')
    await expect(a.polls.vote('poll-picnic', 7, sen)).rejects.toThrow('That is not one of the choices.')
  })

  it('cannot run polls', async () => {
    const a = api()
    expect(await a.polls.listAll(sen)).toEqual([])
    await expect(a.polls.create(pollDraft, sen)).rejects.toThrow(/committee/)
    await expect(a.polls.update('poll-picnic', pollDraft, sen)).rejects.toThrow(/committee/)
    await expect(a.polls.remove('poll-picnic', sen)).rejects.toThrow(/committee/)
  })
})

describe('polls, for the committee', () => {
  it('sees every poll with its totals, and names only on a named poll', async () => {
    const all = await api().polls.listAll(admin)
    expect(all.map((s) => s.poll.id)).toContain('poll-draft')
    const picnic = all.find((s) => s.poll.id === 'poll-picnic')!
    expect(picnic.tally).toEqual([1, 2, 1])
    expect(picnic.voters).toBeUndefined()
    const setup = all.find((s) => s.poll.id === 'poll-setup')!
    expect(setup.voters).toContainEqual({ household: 'The Ghoshes', option: 0 })
  })

  it('sees the totals in the members’ list too, even committee-only ones', async () => {
    const setup = (await api().polls.list(admin)).find((v) => v.poll.id === 'poll-setup')!
    expect(setup.tally).toBeDefined()
  })

  it('cannot vote without a household, though it can see the polls', async () => {
    const a = api()
    expect((await a.polls.list(householdless)).length).toBeGreaterThan(0)
    await expect(a.polls.vote('poll-picnic', 0, householdless)).rejects.toThrow(/members/)
  })

  it('makes, changes and removes a poll', async () => {
    const a = api()
    const made = await a.polls.create({ ...pollDraft, options: ['Tea', '', 'Coffee'] }, admin)
    expect(made.options).toEqual(['Tea', 'Coffee'])
    expect(made.opensAt).toBeUndefined()
    const changed = await a.polls.update(made.id, { ...pollDraft, title: 'Tea, coffee or neither?', options: ['Tea', 'Coffee', 'Neither'] }, admin)
    expect(changed.options).toHaveLength(3)
    await a.polls.remove(made.id, admin)
    expect((await a.polls.listAll(admin)).some((s) => s.poll.id === made.id)).toBe(false)
  })

  it('refuses a poll that does not check out, or does not exist', async () => {
    const a = api()
    await expect(a.polls.create({ ...pollDraft, options: ['Only'] }, admin)).rejects.toThrow(/check the poll/)
    await expect(a.polls.update('poll-picnic', { ...pollDraft, options: ['Only'] }, admin)).rejects.toThrow(/check the poll/)
    await expect(a.polls.update('nope', pollDraft, admin)).rejects.toThrow(/no such poll/)
    await expect(a.polls.remove('nope', admin)).rejects.toThrow(/no such poll/)
  })

  it('locks the choices, and whether it is named, once anybody has voted — not the title', async () => {
    const a = api()
    const picnic = (await a.polls.listAll(admin)).find((s) => s.poll.id === 'poll-picnic')!.poll
    const same = { title: picnic.title, detail: picnic.detail, options: picnic.options, named: picnic.named, results: picnic.results, opensAt: picnic.opensAt!, closesAt: '' }
    await expect(a.polls.update('poll-picnic', { ...same, options: ['Only Sunday', 'Saturday'] }, admin)).rejects.toThrow(
      'People have already voted, so the choices cannot change.',
    )
    await expect(a.polls.update('poll-picnic', { ...same, named: true }, admin)).rejects.toThrow(/whether the poll is named/)
    expect((await a.polls.update('poll-picnic', { ...same, title: 'Which Sunday, finally?' }, admin)).title).toBe('Which Sunday, finally?')
  })
})

describe('quizzes, for a visitor', () => {
  it('lists only the opened public quiz', async () => {
    const cards = await api().quizzes.list(visitor)
    expect(cards.map((c) => c.quiz.id)).toEqual(['quiz-pujo'])
    expect(cards[0].played).toBeUndefined()
  })

  it('gets its questions without any answer in them', async () => {
    const quiz = (await api().quizzes.get('quiz-pujo', visitor))!
    expect(quiz.questions).toHaveLength(4)
    expect(quiz.questions[0]).not.toHaveProperty('correct')
  })

  it('cannot get a members’ quiz or a draft', async () => {
    const a = api()
    expect(await a.quizzes.get('quiz-words', visitor)).toBeNull()
    expect(await a.quizzes.get('quiz-draft', visitor)).toBeNull()
    expect(await a.quizzes.get('nope', visitor)).toBeNull()
  })

  it('plays, is marked, and leaves only a number behind', async () => {
    const a = api()
    const result = await a.quizzes.submit('quiz-pujo', [3, 0, 1, 1], true, visitor)
    expect(result).toMatchObject({ score: 4, total: 4, correct: [3, 0, 1, 1] })
    expect(result.explanations).toHaveLength(4)
    // And can play again: there is nothing to say they already have.
    expect((await a.quizzes.submit('quiz-pujo', [0, 0, 0, 0], true, visitor)).score).toBe(1)
    const stats = (await a.quizzes.listAll(admin)).find((s) => s.quiz.id === 'quiz-pujo')!
    expect(stats).toMatchObject({ publicPlays: 16, memberPlays: 0 })
  })

  it('cannot play a members’ quiz, a draft, or read a leaderboard', async () => {
    const a = api()
    await expect(a.quizzes.submit('quiz-words', [0], true, visitor)).rejects.toThrow(/members/)
    await expect(a.quizzes.submit('quiz-draft', [0], true, visitor)).rejects.toThrow('There is no such quiz.')
    expect(await a.quizzes.leaderboard('quiz-words', visitor)).toEqual([])
  })
})

describe('quizzes, for a member', () => {
  it('lists every opened quiz with their household’s score once played', async () => {
    const a = api()
    expect((await a.quizzes.list(sen)).map((c) => c.quiz.id).sort()).toEqual(['quiz-pujo', 'quiz-words'])
    await a.quizzes.submit('quiz-words', [0, 1, 0], false, sen)
    const words = (await a.quizzes.list(sen)).find((c) => c.quiz.id === 'quiz-words')!
    expect(words.played).toEqual({ score: 2, total: 3 })
  })

  it('plays once per household', async () => {
    const a = api()
    await a.quizzes.submit('quiz-words', [0, 1, 1], true, sen)
    await expect(a.quizzes.submit('quiz-words', [0, 1, 1], true, sen)).rejects.toThrow('Your household has already played this quiz.')
  })

  it('shows the leaderboard best first, without the names of those who asked not to be shown', async () => {
    const board = await api().quizzes.leaderboard('quiz-words', sen)
    expect(board[0]).toEqual({ household: 'The Ghoshes', score: 3, total: 3 })
    expect(board.find((row) => row.household === undefined)).toEqual({ score: 2, total: 3 })
    expect(board.map((row) => row.household)).not.toContain('The Roys')
  })

  it('cannot read the bank, the attempts or the committee’s list', async () => {
    const a = api()
    expect(await a.quizzes.bank(sen)).toEqual([])
    expect(await a.quizzes.attempts('quiz-words', sen)).toEqual([])
    expect(await a.quizzes.listAll(sen)).toEqual([])
    await expect(a.quizzes.create({ title: 'Mine', intro: '', audience: 'members', opensAt: '', closesAt: '', questionIds: [] }, sen)).rejects.toThrow(/committee/)
    await expect(a.quizzes.createQuestion(questionDraft, sen)).rejects.toThrow(/committee/)
    await expect(a.quizzes.updateQuestion('q-swan', questionDraft, sen)).rejects.toThrow(/committee/)
    await expect(a.quizzes.removeQuestion('q-swan', sen)).rejects.toThrow(/committee/)
    await expect(a.quizzes.update('quiz-words', { title: 'Mine', intro: '', audience: 'members', opensAt: '', closesAt: '', questionIds: [] }, sen)).rejects.toThrow(/committee/)
    await expect(a.quizzes.remove('quiz-words', sen)).rejects.toThrow(/committee/)
  })
})

describe('quizzes, for the committee', () => {
  it('sees every quiz with how many played, and which are locked', async () => {
    const all = await api().quizzes.listAll(admin)
    expect(all.find((s) => s.quiz.id === 'quiz-words')).toMatchObject({ memberPlays: 3, publicPlays: 0, locked: true })
    expect(all.find((s) => s.quiz.id === 'quiz-draft')).toMatchObject({ locked: false })
  })

  it('can open a draft to preview it', async () => {
    expect(await api().quizzes.get('quiz-draft', admin)).not.toBeNull()
  })

  it('sees each household’s play, names included', async () => {
    const attempts = await api().quizzes.attempts('quiz-words', admin)
    expect(attempts.map((a) => a.household)).toEqual(['The Ghoshes', 'The Roys', 'The Mitras'])
  })

  it('reads the bank with answers, and which questions are locked', async () => {
    const bank = await api().quizzes.bank(admin)
    expect(bank.find((q) => q.id === 'q-mishti')).toMatchObject({ correct: 0, locked: true })
    expect(bank.find((q) => q.id === 'q-kojagori')).toMatchObject({ locked: false, creditedTo: 'The Ghoshes' })
  })

  it('keeps a played quiz’s questions but lets the title change', async () => {
    const a = api()
    const words = { title: 'Bengali words', intro: '', audience: 'members' as const, opensAt: '2026-08-25T09:00:00.000Z', closesAt: '', questionIds: ['q-mishti', 'q-bari', 'q-jol'] }
    await expect(a.quizzes.update('quiz-words', { ...words, questionIds: ['q-mishti'] }, admin)).rejects.toThrow(/Make a copy instead/)
    expect((await a.quizzes.update('quiz-words', words, admin)).title).toBe('Bengali words')
  })

  it('keeps a played question’s wording and answer, but lets the explanation change', async () => {
    const a = api()
    const mishti = (await a.quizzes.bank(admin)).find((q) => q.id === 'q-mishti')!
    const same = { prompt: mishti.prompt, options: mishti.options, correct: mishti.correct, explanation: '', tags: [], imageUrl: '', creditedTo: '' }
    await expect(a.quizzes.updateQuestion('q-mishti', { ...same, correct: 1 }, admin)).rejects.toThrow(/cannot change/)
    await expect(a.quizzes.updateQuestion('q-mishti', { ...same, prompt: 'Mishti?' }, admin)).rejects.toThrow(/cannot change/)
    expect((await a.quizzes.updateQuestion('q-mishti', { ...same, explanation: 'As in mishti doi.' }, admin)).explanation).toBe('As in mishti doi.')
  })

  it('makes a question and a quiz, then deletes them in the right order', async () => {
    const a = api()
    const question = await a.quizzes.createQuestion(questionDraft, admin)
    expect(question).toMatchObject({ correct: 1, locked: false })
    const quiz = await a.quizzes.create({ title: 'Sums', intro: '', audience: 'public', opensAt: '', closesAt: '', questionIds: [question.id] }, admin)
    await expect(a.quizzes.removeQuestion(question.id, admin)).rejects.toThrow(/Take it out of the quiz first/)
    await a.quizzes.remove(quiz.id, admin)
    await a.quizzes.removeQuestion(question.id, admin)
    expect((await a.quizzes.bank(admin)).some((q) => q.id === question.id)).toBe(false)
  })

  it('refuses what does not check out or is not there', async () => {
    const a = api()
    const blank = { title: '', intro: '', audience: 'members' as const, opensAt: '', closesAt: '', questionIds: [] }
    await expect(a.quizzes.create(blank, admin)).rejects.toThrow(/check the quiz/)
    await expect(a.quizzes.create({ ...blank, title: 'Ghost', questionIds: ['nope'] }, admin)).rejects.toThrow(/no longer in the bank/)
    await expect(a.quizzes.update('quiz-draft', blank, admin)).rejects.toThrow(/check the quiz/)
    await expect(a.quizzes.update('quiz-draft', { ...blank, title: 'Ghost', questionIds: ['nope'] }, admin)).rejects.toThrow(/no longer in the bank/)
    await expect(a.quizzes.update('nope', { ...blank, title: 'Ghost' }, admin)).rejects.toThrow(/no such quiz/)
    await expect(a.quizzes.remove('nope', admin)).rejects.toThrow(/no such quiz/)
    await expect(a.quizzes.createQuestion({ ...questionDraft, correct: 5 }, admin)).rejects.toThrow(/check the question/)
    await expect(a.quizzes.updateQuestion('q-swan', { ...questionDraft, correct: 5 }, admin)).rejects.toThrow(/check the question/)
    await expect(a.quizzes.updateQuestion('nope', questionDraft, admin)).rejects.toThrow(/no such question/)
    await expect(a.quizzes.removeQuestion('nope', admin)).rejects.toThrow(/no such question/)
  })

  it('plays as a visitor when it has no household of its own', async () => {
    const a = api()
    await a.quizzes.submit('quiz-pujo', [0, 0, 0, 0], true, householdless)
    expect((await a.quizzes.attempts('quiz-pujo', admin))).toEqual([])
  })
})

describe('suggestions', () => {
  const idea = { kind: 'poll' as const, prompt: 'Film night in January?', options: ['Yes', 'No'], note: '', credit: false }

  it('are for members, and arrive waiting', async () => {
    const a = api()
    await expect(a.suggestions.send(idea, visitor)).rejects.toThrow(/members/)
    await expect(a.suggestions.send(idea, householdless)).rejects.toThrow(/members/)
    await expect(a.suggestions.send({ ...idea, options: ['Only'] }, sen)).rejects.toThrow(/check the suggestion/)
    const sent = await a.suggestions.send(idea, sen)
    expect(sent).toMatchObject({ status: 'pending', householdId: 'hh-sen' })
  })

  it('a household reads its own and nobody else’s', async () => {
    const a = api()
    await a.suggestions.send(idea, sen)
    expect((await a.suggestions.listMine(sen)).map((s) => s.prompt)).toEqual(['Film night in January?'])
    expect(await a.suggestions.listMine(visitor)).toEqual([])
    expect(await a.suggestions.listAll(sen)).toEqual([])
  })

  it('the committee reviews them, by name, and can put one back', async () => {
    const a = api()
    const queue = await a.suggestions.listAll(admin)
    expect(queue[0].status).toBe('pending')
    expect(queue[0].household).toBeDefined()
    const approved = await a.suggestions.review('sg-1', 'approved', admin)
    expect(approved).toMatchObject({ status: 'approved', reviewedBy: 'The Chatterjees', household: 'The Ghoshes' })
    const back = await a.suggestions.review('sg-1', 'pending', admin)
    expect(back.reviewedBy).toBeUndefined()
    await a.suggestions.remove('sg-1', admin)
    expect((await a.suggestions.listAll(admin)).some((s) => s.id === 'sg-1')).toBe(false)
  })

  it('members cannot review or remove', async () => {
    const a = api()
    await expect(a.suggestions.review('sg-1', 'approved', sen)).rejects.toThrow(/committee/)
    await expect(a.suggestions.remove('sg-1', sen)).rejects.toThrow(/committee/)
    await expect(a.suggestions.review('nope', 'approved', admin)).rejects.toThrow(/no such suggestion/)
    await expect(a.suggestions.remove('nope', admin)).rejects.toThrow(/no such suggestion/)
  })
})

describe('with a delay, as the app runs it in development', () => {
  it('still answers', async () => {
    const a = createMockApi({ now, latencyMs: 1 })
    expect((await a.quizzes.list(visitor)).length).toBe(1)
  })
})
