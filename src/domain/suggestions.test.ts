import { describe, expect, it } from 'vitest'
import { suggestionsForReview, tidySuggestion, validateSuggestion, waitingSuggestions, type Suggestion, type SuggestionDraft } from './suggestions'

const draft = (over: Partial<SuggestionDraft> = {}): SuggestionDraft => ({
  kind: 'question',
  prompt: 'Which river runs past Kumartuli?',
  options: ['Hooghly', 'Padma'],
  answer: 0,
  note: '',
  credit: true,
  ...over,
})

describe('checking a suggestion', () => {
  it('accepts a question with its answer, and a poll without one', () => {
    expect(validateSuggestion(draft())).toEqual({})
    expect(validateSuggestion(draft({ kind: 'poll', answer: undefined }))).toEqual({})
  })

  it('wants something to ask', () => {
    expect(validateSuggestion(draft({ prompt: '' })).prompt).toBe('Write the question.')
    expect(validateSuggestion(draft({ kind: 'poll', prompt: '' })).prompt).toBe('Write what to ask.')
    expect(validateSuggestion(draft({ prompt: 'x'.repeat(301) })).prompt).toBeDefined()
  })

  it('wants at least two choices, every row filled, and not too many', () => {
    expect(validateSuggestion(draft({ options: ['One'] })).options).toBeDefined()
    expect(validateSuggestion(draft({ options: ['A', '', 'B'] })).options).toBe('Fill in every choice, or remove the empty one.')
    expect(validateSuggestion(draft({ options: ['1', '2', '3', '4', '5', '6', '7'] })).options).toBeDefined()
    expect(validateSuggestion(draft({ kind: 'poll', answer: undefined, options: ['1', '2', '3', '4', '5', '6', '7'] }))).toEqual({})
    expect(validateSuggestion(draft({ options: ['A', 'x'.repeat(121)] })).options).toBeDefined()
  })

  it('wants the right answer on a question', () => {
    expect(validateSuggestion(draft({ answer: undefined })).answer).toBeDefined()
    expect(validateSuggestion(draft({ answer: 5 })).answer).toBeDefined()
  })

  it('keeps the note short', () => {
    expect(validateSuggestion(draft({ note: 'x'.repeat(1001) })).note).toBeDefined()
  })
})

describe('tidying before it is sent', () => {
  it('trims, and drops an answer from a poll', () => {
    expect(tidySuggestion(draft({ kind: 'poll', prompt: '  Film night? ', options: [' Yes ', 'No'], answer: 1, note: ' hi ' }))).toEqual({
      kind: 'poll',
      prompt: 'Film night?',
      options: ['Yes', 'No'],
      note: 'hi',
      credit: true,
    })
    expect(tidySuggestion(draft()).answer).toBe(0)
  })
})

describe('the committee’s queue', () => {
  const s = (id: string, status: Suggestion['status'], createdAt: string): Suggestion => ({
    id,
    kind: 'poll',
    prompt: 'P',
    options: ['A', 'B'],
    note: '',
    credit: false,
    householdId: 'hh',
    status,
    createdAt,
  })

  it('puts what is waiting first, then the newest', () => {
    const all = [s('old', 'approved', '2026-09-03'), s('wait-old', 'pending', '2026-09-01'), s('wait-new', 'pending', '2026-09-02')]
    expect(suggestionsForReview(all).map((x) => x.id)).toEqual(['wait-new', 'wait-old', 'old'])
    expect(waitingSuggestions(all)).toHaveLength(2)
  })
})
