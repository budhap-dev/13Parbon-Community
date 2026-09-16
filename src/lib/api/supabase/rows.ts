import type { ContactKind, ContactMessage } from '@/domain/contact'
import type { Household, HouseholdDraft, Person } from '@/domain/household'

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
  listed_in_directory: boolean
  share_email: boolean
  share_phone: boolean
  /** From PostgREST's embedded select: `select=*,people(*)`. */
  people?: PersonRow[] | null
}

export type PersonRow = {
  id: string
  household_id: string
  name: string
  age_group: 'adult' | 'child'
  age: number | null
  note: string | null
}

/** Everything this app reads about a household, including the people in it. */
export const HOUSEHOLD_SELECT = '*,people(*)'

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    ageGroup: row.age_group,
    // Absent rather than null: the domain says a field is missing by not being there.
    ...(row.age === null ? {} : { age: row.age }),
    ...(row.note === null ? {} : { note: row.note }),
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
    role: row.role,
    listedInDirectory: row.listed_in_directory,
    shareEmail: row.share_email,
    sharePhone: row.share_phone,
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
    listed_in_directory: draft.listedInDirectory,
    share_email: draft.shareEmail,
    share_phone: draft.sharePhone,
    ...(committee
      ? {
          google_email: draft.googleEmail ?? null,
          role: draft.role ?? 'member',
          membership_status: draft.membershipStatus ?? 'active',
          membership_paid_to: draft.membershipPaidTo || null,
        }
      : {}),
  }
}

/** The people of a household, as rows to replace what is there. */
export function peopleRows(householdId: string, draft: HouseholdDraft): Omit<PersonRow, 'id'>[] {
  return draft.people.map((person) => ({
    household_id: householdId,
    name: person.name.trim(),
    age_group: person.ageGroup,
    age: person.ageGroup === 'child' && person.age !== undefined ? person.age : null,
    note: person.note?.trim() ? person.note.trim() : null,
  }))
}

export type DocumentRow = { id: string; title: string; category: 'minutes' | 'guidelines' | 'resources'; file_url: string; added_on: string }
export type AttemptRow = { id: string; email: string; name: string | null; last_tried_at: string; attempts: number; resolved: boolean }
export type AttendanceRow = { event_slug: string; held_on: string; households: number; adults: number; children: number; recorded_at: string }
export type DirectoryRow = {
  id: string
  name: string
  contact_name: string
  adults: number
  children: number
  email: string | null
  phone: string | null
  interests: string[] | null
}

/**
 * A directory entry, as the view hands it over.
 *
 * The masking is already done — the view decides what each household agreed to share, and a
 * column it withheld arrives as null. Nothing here re-checks that, because re-checking it in
 * the browser would suggest the browser were the thing deciding.
 */
export function toDirectoryEntry(row: DirectoryRow) {
  const a = row.adults
  const c = row.children
  const size = [`${a} ${a === 1 ? 'adult' : 'adults'}`, ...(c > 0 ? [`${c} ${c === 1 ? 'child' : 'children'}`] : [])].join(', ')
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    size,
    ...(row.email === null ? {} : { email: row.email }),
    ...(row.phone === null ? {} : { phone: row.phone }),
    interests: row.interests ?? [],
  }
}

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
