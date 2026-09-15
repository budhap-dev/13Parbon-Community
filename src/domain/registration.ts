export type Registration = {
  id: string
  eventId: string
  householdId: string
  adults: number
  children: number
  /** What they offered to help with, if anything. */
  helping?: string
  /** Dietary needs, access needs, anything the organisers should know. */
  notes?: string
  /** ISO 8601 timestamp */
  registeredAt: string
}

export type EventTotals = {
  households: number
  adults: number
  children: number
  people: number
  helping: number
  withNotes: number
}

export function totalsFor(registrations: Registration[]): EventTotals {
  return registrations.reduce<EventTotals>(
    (total, r) => ({
      households: total.households + 1,
      adults: total.adults + r.adults,
      children: total.children + r.children,
      people: total.people + r.adults + r.children,
      helping: total.helping + (r.helping ? 1 : 0),
      withNotes: total.withNotes + (r.notes ? 1 : 0),
    }),
    { households: 0, adults: 0, children: 0, people: 0, helping: 0, withNotes: 0 },
  )
}

/**
 * What is kept of an event once the year is up.
 *
 * Decided 2026-09-15: attendance rows are held for twelve months, and the numbers are kept for
 * good. So this is the part with nobody in it — how many came, and nothing about who.
 *
 * It exists because deleting everything at twelve months would empty two things the project has
 * already promised: the memories the story is built around, and the history timeline. Both want
 * numbers. Neither wants names. And the committee planning next year's catering wants to know
 * that a hundred and eighty people came last time, not which families they were.
 *
 * `helping` and `withNotes` are deliberately absent. They are counts, but counting how many
 * households wrote something about a dietary need keeps a fact about those households.
 */
export type EventAttendance = {
  eventId: string
  /** ISO 8601 date of the event itself, so the history reads in order. */
  heldOn: string
  households: number
  adults: number
  children: number
}

/**
 * The record to keep before the rows are deleted.
 *
 * Has to be written *before* the deletion, or the number goes with the names. That ordering is
 * the whole of this feature — everything else is a cron line.
 */
export function attendanceOf(eventId: string, heldOn: string, registrations: Registration[]): EventAttendance {
  const totals = totalsFor(registrations)
  return { eventId, heldOn, households: totals.households, adults: totals.adults, children: totals.children }
}

/** How many days old a registration is, for deciding whether its year is up. */
export function daysOld(registeredAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(registeredAt).getTime()) / 86_400_000)
}

/** Twelve months, as the committee decided. */
export const RETAIN_DAYS = 365

/** The registrations whose year is up, and which should now be deleted. */
export function pastRetention(registrations: Registration[], now: Date): Registration[] {
  return registrations.filter((r) => daysOld(r.registeredAt, now) > RETAIN_DAYS)
}
