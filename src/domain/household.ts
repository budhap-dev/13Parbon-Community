export type Role = 'member' | 'admin'

export type MembershipStatus = 'active' | 'lapsed'

export type Membership = {
  status: MembershipStatus
  /** ISO 8601 date the current year runs to. */
  paidTo: string
}

export type Person = {
  id: string
  name: string
  /** Adults and children are counted separately for catering and the children's programme. */
  ageGroup: 'adult' | 'child'
  /** Age, for children only, so organisers can plan the programme. */
  age?: number
  /** Dietary needs, what they would like to do on stage, anything the organisers should know. */
  note?: string
}

export type Household = {
  id: string
  name: string
  contactName: string
  /**
   * How the committee reaches them. Absent where nobody has it yet.
   *
   * Optional on purpose. A required field you cannot always fill is a field somebody types
   * `unknown@example.com` into, and then the database holds a fact that is not true. Recording
   * what is known beats inventing what is not.
   */
  email?: string
  phone?: string
  /**
   * The Google address that signs in. Null until the committee records one, or until
   * the household has been invited but never signed in.
   */
  googleEmail: string | null
  people: Person[]
  /** What the household is happy to help with. */
  interests: string[]
  /** ISO 8601 date. */
  memberSince: string
  membership: Membership
  role: Role
  /** Whether other signed-in members can find this household at all. */
  listedInDirectory: boolean
  shareEmail: boolean
  sharePhone: boolean
}

export function adults(household: Pick<Household, 'people'>): number {
  return household.people.filter((p) => p.ageGroup === 'adult').length
}

export function children(household: Pick<Household, 'people'>): number {
  return household.people.filter((p) => p.ageGroup === 'child').length
}

/** "2 adults, 1 child", or "2 adults" when there are none. */
export function describeSize(household: Pick<Household, 'people'>): string {
  const a = adults(household)
  const c = children(household)
  const parts = [`${a} ${a === 1 ? 'adult' : 'adults'}`]
  if (c > 0) parts.push(`${c} ${c === 1 ? 'child' : 'children'}`)
  return parts.join(', ')
}

/**
 * All another member may ever see about a household: a name, a size, and whatever that
 * household agreed to share. No address, no sign-in address, no membership status, and no
 * name of any person in it — a child's name never leaves their own household.
 *
 * This is a type and not merely a mapping because it is the shape the API is allowed to
 * return. `Household` carries things a member must never receive, so a method that promises
 * `Household[]` to a member is a leak waiting for somebody to open devtools, however
 * carefully the page that consumes it draws only part of it.
 */
export type DirectoryEntry = {
  id: string
  name: string
  contactName: string
  size: string
  email?: string
  phone?: string
  interests: string[]
}

/**
 * Who is making a request. The real client carries a signed token and Postgres reads the
 * household and role out of it; this carries the same two facts, so that the mock can refuse
 * exactly what row level security refuses. Null is a visitor.
 *
 * Passed per call rather than held on the client on purpose: it makes every read that depends
 * on who is asking say so in its own signature, and there is no ambient state to get stale
 * between signing out and the next query.
 */
export type Viewer = { householdId: string; role: Role } | null

/** Whether this viewer acts for the committee. */
export function isAdmin(viewer: Viewer): viewer is { householdId: string; role: 'admin' } {
  return viewer?.role === 'admin'
}

/** Whether this viewer is signed in and matched to a household at all. */
export function isMember(viewer: Viewer): viewer is NonNullable<Viewer> {
  return viewer !== null
}

/**
 * What another member may see about this household. Returns null when the household
 * has chosen not to appear at all. Children's names never leave the household.
 */
export function directoryEntry(household: Household): DirectoryEntry | null {
  if (!household.listedInDirectory) return null
  return {
    id: household.id,
    name: household.name,
    contactName: household.contactName,
    size: describeSize(household),
    email: household.shareEmail && household.email ? household.email : undefined,
    phone: household.sharePhone ? household.phone : undefined,
    interests: household.interests,
  }
}

/** A person as the form holds them, before they have an id. */
export type PersonInput = {
  name: string
  ageGroup: 'adult' | 'child'
  /** Children only. Organisers plan the programme around who is coming. */
  age?: number
  note?: string
}

/**
 * A household as the form holds it. The committee edits all of this; a household edits the
 * part of it that is theirs — which is everything here except `googleEmail`, and except the
 * membership and role fields, which are not in this type at all.
 *
 * Those three live outside it on purpose. Row level security decides rows and not columns, so
 * in the database a member is stopped from changing them by a trigger; keeping them out of the
 * shape the form edits is the same rule said a second time, in the place where the mistake
 * would otherwise be easy to make.
 */
export type HouseholdInput = {
  name: string
  contactName: string
  /**
   * How the committee reaches them. Absent where nobody has it yet.
   *
   * Optional on purpose. A required field you cannot always fill is a field somebody types
   * `unknown@example.com` into, and then the database holds a fact that is not true. Recording
   * what is known beats inventing what is not.
   */
  email?: string
  phone?: string
  people: PersonInput[]
  interests: string[]
  listedInDirectory: boolean
  shareEmail: boolean
  sharePhone: boolean
}

/**
 * The committee's fields, kept apart from `HouseholdInput` because a member may not change any
 * of them even on their own row. In the database that separation is a trigger, since row level
 * security decides rows and not columns.
 */
export type CommitteeFields = {
  googleEmail: string | null
  role: Role
  membershipStatus: MembershipStatus
  /** ISO 8601 date, or empty for not recorded. */
  membershipPaidTo: string
}

/**
 * What a form hands back. The committee's half is optional because a member's form never
 * carries it — and the API refuses it from them even if it arrives, rather than trusting that.
 */
export type HouseholdDraft = HouseholdInput & Partial<CommitteeFields>

export type HouseholdErrors = {
  name?: string
  contactName?: string
  email?: string
  googleEmail?: string
  /** About the list of people as a whole, rather than any one of them. */
  people?: string
  /** Keyed by position in the list. */
  person?: Record<number, { name?: string; age?: string }>
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Field-level validation, shared by the form and the API boundary.
 *
 * Every rule here has a `check` constraint saying the same thing in `supabase/portal.sql`.
 * This one exists to tell somebody what is wrong while they are typing; that one exists
 * because this one runs in a browser and can be skipped.
 */
export function validateHousehold(input: HouseholdInput): HouseholdErrors {
  const errors: HouseholdErrors = {}

  if (input.name.trim().length < 2) errors.name = 'Give the household a name, such as “The Sens”.'
  if (input.contactName.trim().length < 2) errors.contactName = 'Who should the committee speak to?'
  // Optional, but wrong is worse than missing: a mistyped address looks like a working one.
  if (input.email?.trim() && !EMAIL.test(input.email.trim())) {
    errors.email = 'That does not look like an email address.'
  }

  const people = input.people
  if (people.length === 0) {
    errors.people = 'Add at least the one person.'
  } else if (!people.some((p) => p.ageGroup === 'adult')) {
    // Children are counted and catered for, but somebody has to be the grown-up.
    errors.people = 'A household needs at least one adult.'
  }

  const perPerson: Record<number, { name?: string; age?: string }> = {}
  people.forEach((person, i) => {
    const found: { name?: string; age?: string } = {}
    if (person.name.trim().length === 0) found.name = 'Add a name.'
    if (person.ageGroup === 'child') {
      if (person.age === undefined) found.age = 'How old are they?'
      else if (!Number.isInteger(person.age) || person.age < 0 || person.age > 120) found.age = 'Enter an age in years.'
    }
    if (Object.keys(found).length > 0) perPerson[i] = found
  })
  if (Object.keys(perPerson).length > 0) errors.person = perPerson

  return errors
}

export function isValidHousehold(input: HouseholdInput): boolean {
  const { person, ...rest } = validateHousehold({ ...input })
  return Object.keys(rest).length === 0 && person === undefined
}

/**
 * The sign-in address, tidied and checked. Only the committee ever sets one.
 *
 * Lowercased because Google returns whatever case the person typed when they made the
 * account, and the database matches on it exactly — a capital letter here is somebody
 * locked out for a reason nobody will guess.
 */
export function normaliseGoogleEmail(value: string): { email: string | null; error?: string } {
  const trimmed = value.trim()
  if (trimmed.length === 0) return { email: null }
  if (!EMAIL.test(trimmed)) return { email: null, error: 'Enter the Google address they will sign in with.' }
  return { email: trimmed.toLowerCase() }
}
