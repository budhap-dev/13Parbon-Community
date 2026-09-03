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
 * What another member may see about this household. Returns null when the household
 * has chosen not to appear at all. Children's names never leave the household.
 */
export function directoryEntry(household: Household): {
  id: string
  name: string
  contactName: string
  size: string
  email?: string
  phone?: string
  interests: string[]
} | null {
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
