/** A Google account that signed in but matched no household. */
export type SignInAttempt = {
  id: string
  email: string
  /** The name Google gave, which is all we know about them. */
  name: string
  /** ISO 8601 timestamp */
  lastTriedAt: string
  attempts: number
  /** Set once the committee has added them or decided not to. */
  resolved: boolean
}

/**
 * The attempts still wanting an answer.
 *
 * One place, because there were two. The People screen filtered the resolved ones out and the
 * badge beside it in the sidebar counted all of them — so dealing with somebody cleared them
 * from the page and left the number stuck there for good, pointing at a screen that had
 * nothing on it. A notification nobody can clear is one people stop reading.
 */
export function unresolved(attempts: SignInAttempt[] | undefined): SignInAttempt[] {
  return attempts?.filter((attempt) => !attempt.resolved) ?? []
}
