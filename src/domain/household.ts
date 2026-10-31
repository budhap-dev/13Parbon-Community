import { folded, matchesEvery, searchWords } from './search'

export type Role = 'member' | 'admin'

export type MembershipStatus = 'active' | 'lapsed'

export type Membership = {
  status: MembershipStatus
  /**
   * ISO 8601 date the current year runs to, or null when nobody has recorded one.
   *
   * Null rather than an empty string, which is what this was. The column is nullable and the
   * status column defaults to `active`, so a household the committee has just written down is
   * genuinely active with no renewal date — and an empty string is a value that satisfies
   * `string`, passes every type check, and throws `RangeError: Invalid time value` the moment
   * something formats it. Two of the three places that read this remembered to guard; the
   * dashboard did not, and took the whole portal down with it.
   */
  paidTo: string | null
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
  /** How they are drawn beside their name. Absent is "not said", and a neutral picture. See `Shown`. */
  shownAs?: Shown
  /**
   * Their own photograph, for adults only, uploaded from the household's page: the square one,
   * served from the photographs bucket. Drawn wherever their picture or initials would be, and on
   * the public About page if they are on the committee. Absent until somebody adds one.
   */
  photo?: string
  /**
   * Their own Google address, for a grown-up who signs in with an account of their own — the
   * household's `googleEmail` is the first, this is for a second or a third. Whoever signs in
   * with it reaches this household, with the household's role. Set by the committee only.
   */
  googleEmail?: string
}

/**
 * Whether somebody is drawn as a woman or girl, a man or boy, or neither.
 *
 * Asked only for the picture beside their name on their own household's page, and optional:
 * left unsaid, they get a picture that is neither. Nothing is decided by it — not the catering
 * count, not who is asked to help — and it is never shown to another household or the public.
 * Adult or child is already a separate question, so this one has two answers, not four.
 */
export type Shown = 'female' | 'male'

/** The words for a person's picture, as their age group would have it said. */
export function shownLabel(person: Pick<Person, 'ageGroup' | 'shownAs'>): string {
  const child = person.ageGroup === 'child'
  if (person.shownAs === 'female') return child ? 'girl' : 'woman'
  if (person.shownAs === 'male') return child ? 'boy' : 'man'
  return child ? 'child' : 'adult'
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
  /**
   * The membership years this household has paid for, newest first. See `payments.ts`.
   *
   * Absent where they could not be read — a database `membership-payments.sql` has not reached
   * yet — which every screen reads as nothing recorded, the same as an empty list.
   */
  payments?: MembershipPayment[]
  role: Role
}

/** One year paid for. `year` is the April it starts in: 2026 is April 2026 to March 2027. */
export type MembershipPayment = {
  year: number
  /** ISO 8601 date the committee ticked it. */
  paidOn: string
}

export function adults(household: Pick<Household, 'people'>): number {
  return household.people.filter((p) => p.ageGroup === 'adult').length
}

export function children(household: Pick<Household, 'people'>): number {
  return household.people.filter((p) => p.ageGroup === 'child').length
}

/** "2 adults · 1 child", or "2 adults" when there are none. */
export function describeSize(household: Pick<Household, 'people'>): string {
  const a = adults(household)
  const c = children(household)
  const parts = [`${a} ${a === 1 ? 'adult' : 'adults'}`]
  if (c > 0) parts.push(`${c} ${c === 1 ? 'child' : 'children'}`)
  return parts.join(' · ')
}

/**
 * The small size of a profile photograph, for the discs beside a name. It is uploaded with the
 * square one and served beside it, so there is nothing more to store.
 */
export function photoThumb(photo: string): string {
  return photo.replace('/full/', '/thumb/')
}

/**
 * The photograph that stands for a household, where its monogram would otherwise be: the main
 * contact's, if they have one. Nobody else's — a household is not to be pictured by whichever
 * of its people happened to add a photograph first.
 */
export function householdPhoto(household: Pick<Household, 'contactName' | 'people'>): string | undefined {
  const contact = plainName(household.contactName)
  return household.people.find((person) => person.ageGroup === 'adult' && person.photo && plainName(person.name) === contact)?.photo
}

/** A face the public website may show: the name as the household wrote it, and its photograph. */
export type PublicPhoto = { name: string; photo: string }

/**
 * A name as the About page and a household might both write it, for telling whether they are the
 * same person: without a Mr. or a Mrs., its capitals, or doubled spaces. "Mr. Dalim  Ghosh" and
 * "dalim ghosh" are one name.
 */
export function plainName(name: string): string {
  return name
    .trim()
    .replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** Looks up a published name's photograph among those the public website was given. */
export function photoByName(photos: readonly PublicPhoto[]): (name: string) => string | undefined {
  const byName = new Map(photos.map((entry) => [plainName(entry.name), entry.photo]))
  return (name) => byName.get(plainName(name))
}

/** Two letters for a household's monogram: its first and last word, past a leading "The". */
export function householdInitials(name: string): string {
  const words = name.replace(/^the\s+/i, '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase()
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


/** A person as the form holds them. */
export type PersonInput = {
  /**
   * The row they already are, so saving changes that row rather than replacing it. Absent for
   * somebody added on the form. Without it every save took the whole household out and put it
   * back, and the trail said every person in it had been removed.
   */
  id?: string
  name: string
  ageGroup: 'adult' | 'child'
  /** Children only. Organisers plan the programme around who is coming. */
  age?: number
  note?: string
  shownAs?: Shown
  /** Adults only; see `Person.photo`. */
  photo?: string
  /**
   * Adults only; see `Person.googleEmail`. A member's form carries it back untouched, because
   * their people are saved whole and a person saved without it has been signed out for good.
   */
  googleEmail?: string
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
  /**
   * When they first joined, as an ISO 8601 date. Empty on a new household is today.
   *
   * It was only ever the day the household was typed in here, and nothing could change it — so
   * a family who had come to every Durga Puja since 2019 read "Member since 7 October 2026".
   */
  memberSince: string
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
  person?: Record<number, { name?: string; age?: string; googleEmail?: string }>
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

/**
 * A household as a form or a save would hand it back, with nothing changed.
 *
 * One place, because a save replaces the people whole: a field missing here is a field the
 * next save throws away. The household form starts from this, and so does linking somebody's
 * sign-in to a person from the People screen.
 */
export function draftOfHousehold(household: Household): HouseholdDraft {
  return {
    name: household.name,
    contactName: household.contactName,
    email: household.email ?? '',
    phone: household.phone ?? '',
    people: household.people.map(({ id, name, ageGroup, age, note, shownAs, photo, googleEmail }) => ({
      id,
      name,
      ageGroup,
      age,
      note,
      shownAs,
      photo,
      googleEmail,
    })),
    interests: [...household.interests],
    googleEmail: household.googleEmail,
    role: household.role,
    membershipStatus: household.membership.status,
    // A date input takes a string; there being no date is the empty one.
    membershipPaidTo: household.membership.paidTo ?? '',
    memberSince: household.memberSince,
  }
}

/**
 * Every address that signs in as this household: its own, and any grown-up's. Lowercased, as
 * the database holds them. The household's own comes first.
 */
export function signInAddresses(household: { googleEmail: string | null; people: readonly { googleEmail?: string }[] }): string[] {
  return [household.googleEmail, ...household.people.map((person) => person.googleEmail)].flatMap((address) =>
    address ? [address.trim().toLowerCase()] : [],
  )
}

/**
 * Whether a household answers to what the committee typed into the search on People.
 *
 * Every word must match something — the household's name, the main contact, either address,
 * the phone, or anybody in it — so "das ruma" finds Ruma in the Dases and not every Das. The
 * people are in it because the question is usually "which household is Anjali in?".
 */
export function householdMatches(household: Household, query: string): boolean {
  const words = searchWords(query)
  if (words.length === 0) return true
  return matchesEvery(words, householdText(household))
}

/** Everything a household can be found by, folded. Shared with the portal's search. */
export function householdText(household: Household): string {
  return folded(
    [
      household.name,
      household.contactName,
      household.email ?? '',
      ...signInAddresses(household),
      household.phone ?? '',
      ...household.people.map((person) => person.name),
    ].join('\n'),
  )
}
