/**
 * A record of something having been changed, and by whom.
 *
 * Written for the question that actually gets asked months later — "who unpublished that?",
 * "when did she become an admin?" — which is why it keeps the value before as well as after.
 * A trail saying only that a row changed answers neither.
 */
export type AuditEntry = {
  id: string
  /** The household that acted. Recorded even for an admin, because an admin is a person. */
  actorHouseholdId: string
  /** What was done, in the same words `can()` uses, so the two can be read against each other. */
  action: string
  /** What it was done to: a table and a row. */
  subject: { kind: string; id: string }
  /** Only the fields that moved, each with what it was and what it became. */
  changes: Record<string, { from: unknown; to: unknown }>
  /** ISO 8601 timestamp */
  at: string
}

/** The fields that differ between two versions of a row, and how. */
export function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!Object.is(before[key], after[key])) changes[key] = { from: before[key], to: after[key] }
  }
  return changes
}

/** Whether anything actually moved. A write that changed nothing is not worth a row. */
export function isEmpty(changes: Record<string, { from: unknown; to: unknown }>): boolean {
  return Object.keys(changes).length === 0
}
