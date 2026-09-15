/**
 * How many came to an event.
 *
 * Entered by the committee, not worked out from anything. Registration is the committee's
 * Google Form and the replies stay in their sheet, so the number is the one thing that crosses
 * over — and typing in a number is the whole of it.
 *
 * That is the point rather than a shortcut. A count has nobody in it: no household is named, no
 * dietary note travels, nothing has to be matched to anybody, and there is nothing here that a
 * member could ever ask us to delete. The alternative — reading the sheet and matching rows to
 * households — would pull every registrant's details into this database, which is exactly what
 * leaving registration on Google Forms was meant to avoid.
 */
export type EventAttendance = {
  eventId: string
  /** ISO 8601 date the event was held. */
  heldOn: string
  households: number
  adults: number
  children: number
  /** Who recorded it, and when, so a surprising number can be asked about. */
  recordedAt: string
}

export type AttendanceDraft = {
  eventId: string
  heldOn: string
  households: number
  adults: number
  children: number
}

export type AttendanceErrors = Partial<Record<keyof AttendanceDraft, string>>

export function validateAttendance(draft: AttendanceDraft): AttendanceErrors {
  const errors: AttendanceErrors = {}
  if (!draft.eventId) errors.eventId = 'Which event was this?'
  if (!draft.heldOn) errors.heldOn = 'When was it held?'

  for (const field of ['households', 'adults', 'children'] as const) {
    const value = draft[field]
    if (!Number.isInteger(value) || value < 0) errors[field] = 'A whole number, or nothing.'
  }

  // Not a rule about the world so much as a sign of a slip: more households than adults almost
  // always means the columns went in the wrong boxes.
  if (!errors.households && !errors.adults && draft.households > draft.adults && draft.adults > 0) {
    errors.households = 'More households than adults — are those the right way round?'
  }
  return errors
}

export function isValidAttendance(draft: AttendanceDraft): boolean {
  return Object.keys(validateAttendance(draft)).length === 0
}

/** Everybody, of any age. The number the hall and the caterer care about. */
export function peopleAt(attendance: Pick<EventAttendance, 'adults' | 'children'>): number {
  return attendance.adults + attendance.children
}
