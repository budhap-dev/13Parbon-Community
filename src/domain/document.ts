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
 *
 * An address that now belongs to a household has had its answer, whether or not anybody pressed
 * anything: adding the household is the answer. Without this, somebody added from this very
 * panel stayed on it, offering "Add household" for a household that already existed.
 */
export function unresolved(
  attempts: SignInAttempt[] | undefined,
  households: readonly { googleEmail: string | null }[] = [],
): SignInAttempt[] {
  const onTheList = new Set(households.flatMap((h) => (h.googleEmail ? [h.googleEmail.trim().toLowerCase()] : [])))
  return attempts?.filter((attempt) => !attempt.resolved && !onTheList.has(attempt.email.trim().toLowerCase())) ?? []
}
