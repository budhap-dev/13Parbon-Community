import type { ContactKind, ContactMessage } from '@/domain/contact'
import type { Household, HouseholdDraft, Person, PersonInput } from '@/domain/household'

/**
 * Between the database's words and the app's.
 *
 * Postgres is snake_case by convention and the domain is camelCase, and `membership` is one
 * object here and two columns there. Kept as pure functions, apart from anything that talks to
 * the network, because this is where a silent mistake lives: a mistyped column does not throw,
 * it arrives as `undefined` and shows as a blank on a page.
 */

export type HouseholdRow = {
  id: string
  name: string
  contact_name: string
  email: string | null
  phone: string | null
  google_email: string | null
  interests: string[] | null
  member_since: string
  membership_status: 'active' | 'lapsed'
  membership_paid_to: string | null
  role: 'member' | 'admin'
  /** From PostgREST's embedded select: `select=*,people(*)`. */
  people?: PersonRow[] | null
  /** The same, from `membership-payments.sql`'s table. Absent on a database it has not reached. */
  membership_payments?: PaymentRow[] | null
}

export type PaymentRow = { year: number; paid_on: string }

export type PersonRow = {
  id: string
  household_id: string
  name: string
  age_group: 'adult' | 'child'
  age: number | null
  note: string | null
  /** Absent until `people-shown-as.sql` has been run, and null where nobody has said. */
  shown_as?: 'female' | 'male' | null
  /** Absent until `people-photo.sql` has been run, and null where nobody has added one. */
  photo_url?: string | null
  /** Absent until portal.sql has been re-run with it, and null for anybody who does not sign in. */
  google_email?: string | null
}

/** Everything this app reads about a household, including the people in it and the years paid. */
export const HOUSEHOLD_SELECT = '*,people(*),membership_payments(year,paid_on)'

/**
 * The same, for a database `membership-payments.sql` has not reached: asked for a table that is
 * not there, PostgREST refuses the whole read, and the portal would go with it.
 */
export const HOUSEHOLD_SELECT_WITHOUT_PAYMENTS = '*,people(*)'

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    ageGroup: row.age_group,
    // Absent rather than null: the domain says a field is missing by not being there.
    ...(row.age === null ? {} : { age: row.age }),
    ...(row.note === null ? {} : { note: row.note }),
    ...(row.shown_as === 'female' || row.shown_as === 'male' ? { shownAs: row.shown_as } : {}),
    ...(row.age_group === 'adult' && typeof row.photo_url === 'string' && row.photo_url ? { photo: row.photo_url } : {}),
    ...(row.age_group === 'adult' && typeof row.google_email === 'string' && row.google_email
      ? { googleEmail: row.google_email }
      : {}),
  }
}

export function toHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    ...(row.email === null ? {} : { email: row.email }),
    ...(row.phone === null ? {} : { phone: row.phone }),
    googleEmail: row.google_email,
    people: (row.people ?? []).map(toPerson),
    interests: row.interests ?? [],
    memberSince: row.member_since,
    membership: { status: row.membership_status, paidTo: row.membership_paid_to },
    ...(Array.isArray(row.membership_payments)
      ? {
          payments: row.membership_payments
            .map((payment) => ({ year: payment.year, paidOn: payment.paid_on }))
            .sort((a, b) => b.year - a.year),
        }
      : {}),
    role: row.role,
  }
}

/**
 * The household's own columns from a draft.
 *
 * The committee's three — role, sign-in address, membership — are only included when they are
 * given, so a member's save cannot carry them even by accident. The database refuses them
 * anyway, by trigger; this is the same rule one layer earlier, where the error would be
 * clearer than a 42501 from Postgres.
 */
export function fromDraft(draft: HouseholdDraft, committee: boolean): Record<string, unknown> {
  const text = (value: string | undefined) => (value?.trim() ? value.trim() : null)
  return {
    name: draft.name.trim(),
    contact_name: draft.contactName.trim(),
    email: text(draft.email),
    phone: text(draft.phone),
    interests: draft.interests,
    ...(committee
      ? {
          google_email: draft.googleEmail ?? null,
          role: draft.role ?? 'member',
          membership_status: draft.membershipStatus ?? 'active',
          membership_paid_to: draft.membershipPaidTo || null,
          // Never sent empty: the column has no blank, and its default is the day of adding.
          ...(draft.memberSince ? { member_since: draft.memberSince } : {}),
        }
      : {}),
  }
}

/** The people of a household, as rows to add. */
export function peopleRows(householdId: string, draft: HouseholdDraft): Omit<PersonRow, 'id'>[] {
  return draft.people.map((person) => personRow(householdId, person))
}

function personRow(householdId: string, person: PersonInput): Omit<PersonRow, 'id'> {
  return {
    household_id: householdId,
    name: person.name.trim(),
    age_group: person.ageGroup,
    age: person.ageGroup === 'child' && person.age !== undefined ? person.age : null,
    note: person.note?.trim() ? person.note.trim() : null,
    // Only when somebody has said. On a new row leaving it out is the column's own null — and a
    // database the new column has not reached yet still takes every save that does not use it.
    ...(person.shownAs ? { shown_as: person.shownAs } : {}),
    // The same, for the photograph: and never a child's, whatever the form sent.
    ...(person.ageGroup === 'adult' && person.photo ? { photo_url: person.photo } : {}),
    // And the address that signs them in, carried through every save so that saving the
    // household does not sign them out. The database refuses one a member added themselves.
    ...(person.ageGroup === 'adult' && person.googleEmail ? { google_email: person.googleEmail.trim().toLowerCase() } : {}),
  }
}

/** The columns a row has only once a later script has added them, and that are empty unless said. */
const LATER_COLUMNS = ['shown_as', 'photo_url', 'google_email'] as const

/**
 * What has to change on a person's row already there, and nothing else.
 *
 * Empty when nothing did, so a save that changed somebody's note leaves everybody else's row
 * alone — and the trail says what changed, rather than that the whole household was taken out
 * and put back. An optional column left out means clearing what the row has, but only where the
 * row has the column: one a script has not reached yet is not asked about.
 */
export function personChanges(existing: PersonRow, person: PersonInput): Partial<Omit<PersonRow, 'id'>> {
  const wanted: Record<string, unknown> = { ...personRow(existing.household_id, person) }
  for (const column of LATER_COLUMNS) {
    if (!(column in wanted) && column in existing) wanted[column] = null
  }
  const had = existing as Record<string, unknown>
  return Object.fromEntries(Object.entries(wanted).filter(([column, value]) => (had[column] ?? null) !== (value ?? null)))
}

export type DocumentRow = { id: string; title: string; category: 'minutes' | 'guidelines' | 'resources'; file_url: string; added_on: string }
export type AttemptRow = { id: string; email: string; name: string | null; last_tried_at: string; attempts: number; resolved: boolean }
export type AttendanceRow = { event_slug: string; held_on: string; households: number; adults: number; children: number; recorded_at: string }
export const toDocument = (row: DocumentRow) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  fileUrl: row.file_url,
  addedOn: row.added_on,
})

export const toAttempt = (row: AttemptRow) => ({
  id: row.id,
  email: row.email,
  name: row.name ?? row.email,
  lastTriedAt: row.last_tried_at,
  attempts: row.attempts,
  resolved: row.resolved,
})

export const toAttendance = (row: AttendanceRow) => ({
  eventId: row.event_slug,
  heldOn: row.held_on,
  households: row.households,
  adults: row.adults,
  children: row.children,
  recordedAt: row.recorded_at,
})

export type MessageRow = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  kind: ContactKind
  handled_by: string | null
  handled_note: string | null
  created_at: string
}

/**
 * `handled_by` and `handled_note` are left off the object entirely when they are null, rather
 * than set to null or to ''. `ContactMessage` marks them optional and every screen asks
 * `message.handledBy ? …`, so an empty string would read as dealt with by nobody, which is a
 * message that quietly leaves the unread count.
 */
export function toMessage(row: MessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    kind: row.kind,
    createdAt: row.created_at,
    ...(row.handled_by ? { handledBy: row.handled_by } : {}),
    ...(row.handled_note ? { handledNote: row.handled_note } : {}),
  }
}
