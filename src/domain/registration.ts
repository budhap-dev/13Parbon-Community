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
