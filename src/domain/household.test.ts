import {
  adults,
  children,
  describeSize,
  householdMatches,
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
}

describe('household', () => {
  it('counts adults and children separately', () => {
    expect(adults(base)).toBe(2)
    expect(children(base)).toBe(1)
    expect(describeSize(base)).toBe('2 adults, 1 child')
    expect(describeSize({ people: [base.people[0]] })).toBe('1 adult')
    expect(describeSize({ people: [...base.people, { id: 'p4', name: 'B', ageGroup: 'child' }] })).toBe('2 adults, 2 children')
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

  it('takes a household with no email at all', () => {
    // A required field the committee cannot always fill is one somebody invents a value for.
    expect(validateHousehold({ ...valid, email: undefined })).toEqual({})
    expect(validateHousehold({ ...valid, email: '  ' })).toEqual({})
  })

  it('still refuses one that is there and wrong', () => {
    // Missing is honest. Mistyped looks like a working address and is not.
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

describe('householdMatches', () => {
  it('matches everything when nothing is typed', () => {
    expect(householdMatches(base, '')).toBe(true)
    expect(householdMatches(base, '   ')).toBe(true)
  })

  it('finds a household by its name, contact, addresses, phone or anybody in it', () => {
    expect(householdMatches(base, 'sens')).toBe(true)
    expect(householdMatches(base, 'RINA')).toBe(true)
    expect(householdMatches(base, 'rina@example')).toBe(true)
    expect(householdMatches(base, 'sen@gmail')).toBe(true)
    expect(householdMatches(base, '900001')).toBe(true)
    expect(householdMatches(base, 'mira')).toBe(true)
  })

  it('needs every word to match something, so two words narrow rather than widen', () => {
    expect(householdMatches(base, 'mira sen')).toBe(true)
    expect(householdMatches(base, 'mira das')).toBe(false)
    expect(householdMatches(base, 'ghosh')).toBe(false)
  })

  it('ignores accents either way round', () => {
    expect(householdMatches({ ...base, contactName: 'Rónnie Sen' }, 'ronnie')).toBe(true)
    expect(householdMatches(base, 'Mîra')).toBe(true)
  })

  it('copes with what has not been recorded', () => {
    const sparse: Household = { ...base, email: undefined, phone: undefined, googleEmail: null }
    expect(householdMatches(sparse, 'example')).toBe(false)
    expect(householdMatches(sparse, 'arjun')).toBe(true)
  })
})
