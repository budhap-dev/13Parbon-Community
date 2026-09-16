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
  email: string
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
    email: row.email,
    ...(row.phone === null ? {} : { phone: row.phone }),
    googleEmail: row.google_email,
    people: (row.people ?? []).map(toPerson),
    interests: row.interests ?? [],
    memberSince: row.member_since,
    membership: { status: row.membership_status, paidTo: row.membership_paid_to ?? '' },
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
    email: draft.email.trim(),
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
