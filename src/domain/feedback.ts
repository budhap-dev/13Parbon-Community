/**
 * What the public says about us, and what the committee does with it.
 *
 * Two things are deliberately *not* here, and both were choices rather than omissions.
 *
 * **No email address.** Signing in with Google proves a person is real; it is not a reason to
 * keep their address. `subjectAccess.ts` matches everything the site holds about a household
 * on the address they wrote from — so an address stored here would quietly create a new
 * category of personal data that the export has to find, the privacy page has to declare, and
 * an erasure has to reach. A name and "this came from a Google account" answers every question
 * the committee actually asks of a piece of feedback, and answers nothing else. The cost is
 * that the committee cannot reply to feedback; the contact form is for somebody who wants one.
 *
 * **The name is whatever Google says, in full** — and it comes from the token, never from the
 * request. Decided 2026-09-21, reversing a first-name-only design: a showcase of Priyas that
 * cannot tell one Priya from another is not attribution, it is decoration. The cost is a real
 * full name on a public page, so it is opt-in, the form shows the exact name before anybody
 * ticks the box, and the committee still approves every piece before it appears.
 */

/**
 * Where a piece of feedback is in the committee's hands.
 *
 * Everything arrives `pending` — enforced in the database, not merely defaulted, because the
 * row is written by whoever is at the keyboard and "the client sends status" is not a rule.
 * `rejected` rather than deleted: somebody turned down twice should not read to the next
 * reviewer as somebody nobody has looked at yet.
 */
export type FeedbackStatus = 'pending' | 'approved' | 'rejected'

/** What the form sends. The name, if there is to be one, comes from the token, not from here. */
export type FeedbackInput = {
  message: string
  /**
   * Whether to put their name to it.
   *
   * A request, not a claim: the database takes the name from the signed-in token and ignores
   * this when there is no token, so ticking it while signed out leaves the feedback anonymous
   * rather than letting somebody sign a stranger's name to their words.
   */
  signed: boolean
}

export type Feedback = {
  id: string
  message: string
  /** Their name as Google gives it, when they chose to sign it. Absent means they did not. */
  authorName?: string
  /** Whether a Google account stands behind it. What makes a signed name worth anything. */
  signedIn: boolean
  status: FeedbackStatus
  /** The committee member who approved or turned it down, by name. Absent while it waits. */
  reviewedBy?: string
  /** ISO 8601 timestamp */
  reviewedAt?: string
  /** ISO 8601 timestamp */
  createdAt: string
}

/**
 * What the app can honestly say once feedback has been sent.
 *
 * Not the stored row, and for the same reason `ContactReceipt` is not one: nothing here is
 * readable back by the person who wrote it, and a return type promising a row the database
 * will not hand over is how the contact form came to be broken on the live site for a month.
 */
export type FeedbackReceipt = { signed: boolean }

export const FEEDBACK_MIN = 10
export const FEEDBACK_MAX = 2000

export type FeedbackErrors = Partial<Record<keyof FeedbackInput, string>>

/** Field-level validation shared by the form and the API boundary. Empty object means valid. */
export function validateFeedback(input: FeedbackInput): FeedbackErrors {
  const errors: FeedbackErrors = {}
  const message = input.message.trim()
  if (message.length < FEEDBACK_MIN) errors.message = 'Say a little more, at least a sentence.'
  else if (message.length > FEEDBACK_MAX) errors.message = 'That is longer than we can take. Please shorten it a little.'
  return errors
}

export function isValidFeedback(input: FeedbackInput): boolean {
  return Object.keys(validateFeedback(input)).length === 0
}

/**
 * A display name as it will be published: trimmed, and with runs of whitespace collapsed.
 *
 * Mirrors what `portal.auth_name()` does to the name on the token, and exists here so the form
 * can show somebody the exact name they are about to put their word to. Empty becomes
 * undefined: a name of nothing is not a name, and "signed by nobody" is what anonymous means.
 */
export function nameForSignature(name: string | null | undefined): string | undefined {
  const tidy = (name ?? '').trim().replace(/\s+/g, ' ')
  return tidy || undefined
}

/** How a piece of feedback is signed on the public page. */
export function attributionOf(feedback: Pick<Feedback, 'authorName'>): string {
  return feedback.authorName ?? 'Anonymous'
}

/** Waiting to be looked at, which is the only count the committee needs on a nav item. */
export function waiting(all: Feedback[]): Feedback[] {
  return all.filter((item) => item.status === 'pending')
}

/**
 * The committee's order: what is waiting first, then newest.
 *
 * The inbox sorts the same way for the same reason — a queue that buries the unread under
 * the handled is a queue that stops being worked.
 */
export function forReview(all: Feedback[]): Feedback[] {
  return [...all].sort(
    (a, b) =>
      Number(b.status === 'pending') - Number(a.status === 'pending') || b.createdAt.localeCompare(a.createdAt),
  )
}
