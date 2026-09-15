import {
  adults,
  children,
  describeSize,
  directoryEntry,
  isValidHousehold,
  normaliseGoogleEmail,
  validateHousehold,
  type Household,
  type HouseholdInput,
} from './household'

const base: Household = {
  id: 'h1',
  name: 'The Sens',
  contactName: 'Rina Sen',
  email: 'rina@example.com',
  phone: '07700 900001',
  googleEmail: 'rina.sen@gmail.com',
  people: [
    { id: 'p1', name: 'Rina Sen', ageGroup: 'adult' },
    { id: 'p2', name: 'Arjun Sen', ageGroup: 'adult' },
    { id: 'p3', name: 'Mira Sen', ageGroup: 'child', age: 7 },
  ],
  interests: ['Cooking'],
  memberSince: '2024-04-01',
  membership: { status: 'active', paidTo: '2027-03-31' },
  role: 'member',
  listedInDirectory: true,
  shareEmail: true,
  sharePhone: false,
}

describe('household', () => {
  it('counts adults and children separately', () => {
    expect(adults(base)).toBe(2)
    expect(children(base)).toBe(1)
    expect(describeSize(base)).toBe('2 adults, 1 child')
    expect(describeSize({ people: [base.people[0]] })).toBe('1 adult')
    expect(describeSize({ people: [...base.people, { id: 'p4', name: 'B', ageGroup: 'child' }] })).toBe('2 adults, 2 children')
  })

  it('honours each sharing choice in the directory entry', () => {
    const entry = directoryEntry(base)
    expect(entry).toMatchObject({ name: 'The Sens', size: '2 adults, 1 child', email: 'rina@example.com' })
    expect(entry?.phone).toBeUndefined()
    expect(directoryEntry({ ...base, shareEmail: false })?.email).toBeUndefined()
    expect(directoryEntry({ ...base, sharePhone: true })?.phone).toBe('07700 900001')
  })

  it('leaves a household out entirely when it has not opted in', () => {
    expect(directoryEntry({ ...base, listedInDirectory: false })).toBeNull()
  })

  it('never puts a person name in the directory entry', () => {
    expect(JSON.stringify(directoryEntry(base))).not.toContain('Mira')
  })
})

describe('validateHousehold', () => {
  const valid: HouseholdInput = {
    name: 'The Sens',
    contactName: 'Rina Sen',
    email: 'rina@example.com',
    people: [
      { name: 'Rina Sen', ageGroup: 'adult' },
      { name: 'Mira Sen', ageGroup: 'child', age: 7 },
    ],
    interests: [],
    listedInDirectory: false,
    shareEmail: false,
    sharePhone: false,
  }

  it('accepts a household with a name, a contact and an adult in it', () => {
    expect(validateHousehold(valid)).toEqual({})
    expect(isValidHousehold(valid)).toBe(true)
  })

  it('asks for a household name and somebody to speak to', () => {
    const errors = validateHousehold({ ...valid, name: ' ', contactName: '' })
    expect(errors.name).toBeTruthy()
    expect(errors.contactName).toBeTruthy()
  })

  it('asks for an address that reaches them', () => {
    expect(validateHousehold({ ...valid, email: 'not-an-address' }).email).toBeTruthy()
  })

  it('refuses an empty household', () => {
    expect(validateHousehold({ ...valid, people: [] }).people).toBeTruthy()
  })

  it('refuses a household of children with no adult in it', () => {
    const errors = validateHousehold({ ...valid, people: [{ name: 'Mira Sen', ageGroup: 'child', age: 7 }] })
    expect(errors.people).toMatch(/adult/i)
  })

  it('wants an age for a child, because the programme is planned around it', () => {
    const errors = validateHousehold({
      ...valid,
      people: [{ name: 'Rina Sen', ageGroup: 'adult' }, { name: 'Mira Sen', ageGroup: 'child' }],
    })
    expect(errors.person?.[1]?.age).toBeTruthy()
  })

  it('does not ask an adult their age', () => {
    const errors = validateHousehold({ ...valid, people: [{ name: 'Rina Sen', ageGroup: 'adult' }] })
    expect(errors.person).toBeUndefined()
  })

  it('points at the person who is wrong, not just at the list', () => {
    const errors = validateHousehold({
      ...valid,
      people: [{ name: 'Rina Sen', ageGroup: 'adult' }, { name: '  ', ageGroup: 'adult' }],
    })
    expect(errors.person?.[1]?.name).toBeTruthy()
    expect(errors.person?.[0]).toBeUndefined()
  })

  it('refuses an age that is not a whole number of years', () => {
    const errors = validateHousehold({
      ...valid,
      people: [{ name: 'Rina Sen', ageGroup: 'adult' }, { name: 'Mira Sen', ageGroup: 'child', age: 7.5 }],
    })
    expect(errors.person?.[1]?.age).toBeTruthy()
  })
})

describe('normaliseGoogleEmail', () => {
  it('lowercases, because Google returns whatever case was typed and the database matches exactly', () => {
    expect(normaliseGoogleEmail('  Rina.Sen@GMAIL.com ')).toEqual({ email: 'rina.sen@gmail.com' })
  })

  it('treats an empty box as no address yet, which is what an invitation is before it is taken up', () => {
    expect(normaliseGoogleEmail('   ')).toEqual({ email: null })
  })

  it('refuses something that is not an address, rather than storing it and locking somebody out', () => {
    expect(normaliseGoogleEmail('rina at gmail').error).toBeTruthy()
  })
})
