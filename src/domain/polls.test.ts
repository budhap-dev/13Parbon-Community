import { describe, expect, it } from 'vitest'
import { byState, canSeeResults, pollDraftOf, share, stateOf, validatePoll, votesLabel, type Poll, type PollDraft } from './polls'

const at = new Date('2026-09-03T10:00:00Z')

const poll = (over: Partial<Poll> = {}): Poll => ({
  id: 'p',
  title: 'Which Sunday?',
  detail: '',
  options: ['A', 'B'],
  named: false,
  results: 'after_vote',
  opensAt: '2026-09-01T09:00:00Z',
  createdAt: '2026-08-31T09:00:00Z',
  ...over,
})

const draft = (over: Partial<PollDraft> = {}): PollDraft => ({ ...pollDraftOf(poll()), ...over })

describe('where a poll is', () => {
  it('is a draft without an opening time, scheduled before it, open after, closed once it closes', () => {
    expect(stateOf({}, at)).toBe('draft')
    expect(stateOf({ opensAt: '2026-09-04T09:00:00Z' }, at)).toBe('scheduled')
    expect(stateOf({ opensAt: '2026-09-01T09:00:00Z' }, at)).toBe('open')
    expect(stateOf({ opensAt: '2026-09-01T09:00:00Z', closesAt: '2026-09-05T09:00:00Z' }, at)).toBe('open')
    expect(stateOf({ opensAt: '2026-09-01T09:00:00Z', closesAt: '2026-09-02T09:00:00Z' }, at)).toBe('closed')
  })

  it('lists open polls first and closed ones last', () => {
    const items = [
      poll({ id: 'closed', closesAt: '2026-09-02T09:00:00Z' }),
      poll({ id: 'draft', opensAt: undefined }),
      poll({ id: 'open' }),
      poll({ id: 'soon', opensAt: '2026-09-10T09:00:00Z' }),
    ]
    expect(byState(items, at).map((p) => p.id)).toEqual(['open', 'soon', 'draft', 'closed'])
  })
})

describe('when a member sees the totals', () => {
  it('after voting, on an after-vote poll', () => {
    expect(canSeeResults(poll(), false, at)).toBe(false)
    expect(canSeeResults(poll(), true, at)).toBe(true)
  })

  it('once it closes, whether or not they voted', () => {
    expect(canSeeResults(poll({ closesAt: '2026-09-02T09:00:00Z' }), false, at)).toBe(true)
    expect(canSeeResults(poll({ results: 'after_close', closesAt: '2026-09-02T09:00:00Z' }), false, at)).toBe(true)
  })

  it('not before an after-close poll closes, even having voted', () => {
    expect(canSeeResults(poll({ results: 'after_close' }), true, at)).toBe(false)
  })

  it('never on a committee-only poll', () => {
    expect(canSeeResults(poll({ results: 'committee', closesAt: '2026-09-02T09:00:00Z' }), true, at)).toBe(false)
  })
})

describe('checking a poll before it is saved', () => {
  it('accepts a sensible one', () => {
    expect(validatePoll(draft())).toEqual({})
  })

  it('wants a question', () => {
    expect(validatePoll(draft({ title: 'Hm' })).title).toBeDefined()
    expect(validatePoll(draft({ title: 'x'.repeat(201) })).title).toBeDefined()
    expect(validatePoll(draft({ detail: 'x'.repeat(1001) })).detail).toBeDefined()
  })

  it('wants two different choices, ignoring the blank rows', () => {
    expect(validatePoll(draft({ options: ['A', ''] })).options).toBe('Give at least two choices.')
    expect(validatePoll(draft({ options: ['A', '', 'B'] }))).toEqual({})
    expect(validatePoll(draft({ options: ['Yes', 'yes'] })).options).toBe('Two of the choices are the same.')
    expect(validatePoll(draft({ options: Array.from({ length: 9 }, (_, i) => `${i}`) })).options).toBeDefined()
    expect(validatePoll(draft({ options: ['A', 'x'.repeat(121)] })).options).toBeDefined()
  })

  it('closes after it opens, and only once it has an opening time', () => {
    expect(validatePoll(draft({ opensAt: '', closesAt: '2026-09-05T09:00:00Z' })).closesAt).toBeDefined()
    expect(validatePoll(draft({ closesAt: '2026-08-01T09:00:00Z' })).closesAt).toBe('It has to close after it opens.')
  })
})

describe('the form', () => {
  it('starts a new poll with two empty choices', () => {
    expect(pollDraftOf()).toMatchObject({ title: '', options: ['', ''], named: false, results: 'after_vote', opensAt: '' })
  })
})

describe('counting', () => {
  it('says vote or votes', () => {
    expect(votesLabel(1)).toBe('1 vote')
    expect(votesLabel(3)).toBe('3 votes')
  })

  it('gives a share of the total, and nothing of nothing', () => {
    expect(share(1, [1, 3])).toBe(25)
    expect(share(0, [0, 0])).toBe(0)
  })
})
