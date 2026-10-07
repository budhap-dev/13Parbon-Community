import { describe, expect, it } from 'vitest'
import {
  FEEDBACK_MAX,
  attributionOf,
  nameForSignature,
  forReview,
  isValidFeedback,
  validateFeedback,
  waiting,
  type Feedback,
} from './feedback'

const piece = (over: Partial<Feedback> = {}): Feedback => ({
  id: 'fb-x',
  message: 'A perfectly ordinary note about a perfectly ordinary evening.',
  signedIn: false,
  status: 'pending',
  createdAt: '2026-09-01T12:00:00',
  ...over,
})

describe('validating a note', () => {
  it('wants at least a sentence', () => {
    expect(validateFeedback({ message: 'good', signed: false }).message).toMatch(/a little more/i)
    expect(isValidFeedback({ message: 'It was a lovely evening.', signed: false })).toBe(true)
  })

  it('counts what was written, not the whitespace around it', () => {
    expect(isValidFeedback({ message: '   nice     ', signed: false })).toBe(false)
  })

  it('stops well short of a paste', () => {
    expect(isValidFeedback({ message: 'a'.repeat(FEEDBACK_MAX), signed: false })).toBe(true)
    expect(validateFeedback({ message: 'a'.repeat(FEEDBACK_MAX + 1), signed: false }).message).toMatch(/shorten/i)
  })

  /**
   * Ticking the box is a request, not a claim. Nothing about it can make a note invalid —
   * the database decides whether there is a name to attach, and losing somebody's words over
   * a checkbox would be the worst possible answer to a mismatch.
   */
  it('does not care whether they asked to sign it', () => {
    expect(isValidFeedback({ message: 'It was a lovely evening.', signed: true })).toBe(true)
  })
})

describe('the name on a note', () => {
  /*
   * In full, surname and all. It was the first word alone until 2026-09-21, which made two
   * people called Priya into one person called Priya on the public page.
   */
  it('keeps the whole name, tidied', () => {
    expect(nameForSignature('Priya Sharma')).toBe('Priya Sharma')
    expect(nameForSignature('  Debashis   Chatterjee ')).toBe('Debashis Chatterjee')
  })

  it('is nothing at all when there is nothing to take', () => {
    expect(nameForSignature('')).toBeUndefined()
    expect(nameForSignature('   ')).toBeUndefined()
    expect(nameForSignature(null)).toBeUndefined()
    expect(nameForSignature(undefined)).toBeUndefined()
  })

  it('reads as Anonymous on the page when nobody signed it', () => {
    expect(attributionOf(piece())).toBe('Anonymous')
    expect(attributionOf(piece({ authorName: 'Meera Ghosh' }))).toBe('Meera Ghosh')
  })
})

describe('the committee’s queue', () => {
  const waitingOld = piece({ id: 'a', status: 'pending', createdAt: '2026-01-01T09:00:00' })
  const approvedNew = piece({ id: 'b', status: 'approved', createdAt: '2026-09-20T09:00:00' })
  const waitingNew = piece({ id: 'c', status: 'pending', createdAt: '2026-09-19T09:00:00' })

  it('counts only what is still waiting', () => {
    expect(waiting([waitingOld, approvedNew, waitingNew]).map((p) => p.id)).toEqual(['a', 'c'])
  })

  /**
   * What is waiting comes first even when it is the oldest thing there. A queue sorted by
   * date alone buries the unread under the handled, and a queue that does that stops being
   * worked — which is the same reasoning the contact inbox uses for takedowns.
   */
  it('puts what is waiting first, then the newest', () => {
    expect(forReview([approvedNew, waitingOld, waitingNew]).map((p) => p.id)).toEqual(['c', 'a', 'b'])
  })

  it('leaves the list it was given alone', () => {
    const given = [approvedNew, waitingOld]
    forReview(given)
    expect(given.map((p) => p.id)).toEqual(['b', 'a'])
  })
})
