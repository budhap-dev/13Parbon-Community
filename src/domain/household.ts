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
  email: string
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
    email: household.shareEmail ? household.email : undefined,
    phone: household.sharePhone ? household.phone : undefined,
    interests: household.interests,
  }
}
