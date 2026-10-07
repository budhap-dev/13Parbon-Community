import { describe, expect, it } from 'vitest'
import type { HouseholdDraft } from '@/domain/household'
import { fromDraft, peopleRows, toHousehold, toPerson, type HouseholdRow } from './rows'

const row: HouseholdRow = {
  id: 'hh-1',
  name: 'The Sens',
  contact_name: 'Rina Sen',
  email: 'rina@example.com',
  phone: '07700 900001',
  google_email: 'rina.sen@gmail.com',
  interests: ['Cooking'],
  member_since: '2024-04-01',
  membership_status: 'active',
  membership_paid_to: '2027-03-31',
  role: 'member',
  people: [
    { id: 'p1', household_id: 'hh-1', name: 'Rina Sen', age_group: 'adult', age: null, note: 'Sings' },
    { id: 'p2', household_id: 'hh-1', name: 'Mira Sen', age_group: 'child', age: 7, note: null },
  ],
}

describe('reading a household back', () => {
  it('turns every column into the name the app uses', () => {
    const household = toHousehold(row)
    expect(household).toMatchObject({
      contactName: 'Rina Sen',
      googleEmail: 'rina.sen@gmail.com',
      memberSince: '2024-04-01',
    })
  })

  it('folds the two membership columns into one', () => {
    expect(toHousehold(row).membership).toEqual({ status: 'active', paidTo: '2027-03-31' })
  })

  it('leaves a missing field out rather than setting it to null', () => {
    // The domain says a field is absent by not being there. A null phone would print as "null".
    const without = toHousehold({ ...row, phone: null })
    expect('phone' in without).toBe(false)
    expect(toPerson(row.people![0])).not.toHaveProperty('age')
    expect(toPerson(row.people![1])).not.toHaveProperty('note')
  })

  it('copes with a household whose people were not asked for', () => {
    expect(toHousehold({ ...row, people: undefined }).people).toEqual([])
    expect(toHousehold({ ...row, interests: null }).interests).toEqual([])
  })

  /*
   * This used to assert the opposite, and the opposite is what crashed the portal.
   *
   * `membership_status` defaults to `active` and `membership_paid_to` has no default, so every
   * household the committee writes down is active with no renewal date. Mapped to an empty
   * string it satisfied `paidTo: string`, passed every type check, and reached
   * `formatDateWithYear`, where `new Date('')` is an Invalid Date and Intl throws
   * `RangeError: Invalid time value` — taking the whole route down on the first real sign-in.
   */
  it('reads a membership nobody has paid as null, not as a string that looks like a date', () => {
    expect(toHousehold({ ...row, membership_paid_to: null }).membership.paidTo).toBeNull()
  })
})

describe('writing a household', () => {
  const draft: HouseholdDraft = {
    name: '  The Sens  ',
    contactName: 'Rina Sen',
    email: ' rina@example.com ',
    phone: '   ',
    people: [
      { name: ' Rina Sen ', ageGroup: 'adult' },
      { name: 'Mira Sen', ageGroup: 'child', age: 7, note: '  Dance group ' },
    ],
    interests: ['Cooking'],
    googleEmail: 'rina.sen@gmail.com',
    role: 'admin',
    membershipStatus: 'lapsed',
    membershipPaidTo: '2026-03-31',
  }

  it('trims, and writes an empty box as null rather than as a space', () => {
    const written = fromDraft(draft, false)
    expect(written.name).toBe('The Sens')
    expect(written.email).toBe('rina@example.com')
    expect(written.phone).toBeNull()
  })

  it('leaves the committee\'s columns out entirely for a member', () => {
    // The trigger would refuse them anyway. Not sending them makes the error a clearer one.
    const written = fromDraft(draft, false)
    expect(written).not.toHaveProperty('role')
    expect(written).not.toHaveProperty('google_email')
    expect(written).not.toHaveProperty('membership_status')
  })

  it('includes them for the committee', () => {
    const written = fromDraft(draft, true)
    expect(written).toMatchObject({
      role: 'admin',
      google_email: 'rina.sen@gmail.com',
      membership_status: 'lapsed',
      membership_paid_to: '2026-03-31',
    })
  })

  it('writes an unset paid-to date as null, not an empty string', () => {
    // A date column will not take ''. It arrives as a 22007 and reads like nonsense.
    expect(fromDraft({ ...draft, membershipPaidTo: '' }, true).membership_paid_to).toBeNull()
  })

  it('gives an adult no age and a child theirs', () => {
    const [adult, child] = peopleRows('hh-1', draft)
    expect(adult).toMatchObject({ household_id: 'hh-1', name: 'Rina Sen', age_group: 'adult', age: null, note: null })
    expect(child).toMatchObject({ name: 'Mira Sen', age_group: 'child', age: 7, note: 'Dance group' })
  })
})
