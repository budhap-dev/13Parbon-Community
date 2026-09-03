import {
  describeParty,
  emptyEventRegistration,
  isValidEventRegistration,
  validateEventRegistration,
} from './event-registration'

const good = { ...emptyEventRegistration, householdName: 'The Sens', email: 'rina@example.com' }

describe('event registration', () => {
  it('accepts a family with an email, phone and notes optional', () => {
    expect(validateEventRegistration(good)).toEqual({})
    expect(isValidEventRegistration(good)).toBe(true)
  })

  it('needs a name, a working email and at least one adult', () => {
    const errors = validateEventRegistration({ ...good, householdName: ' ', email: 'nope', adults: 0 })
    expect(Object.keys(errors).sort()).toEqual(['adults', 'email', 'householdName'])
    expect(validateEventRegistration({ ...good, children: -1 }).children).toBeTruthy()
  })

  it('sends an improbably large party to the committee instead', () => {
    expect(validateEventRegistration({ ...good, adults: 20, children: 15 }).adults).toMatch(/Talk to the committee/)
  })

  it('counts everybody coming', () => {
    expect(describeParty({ adults: 2, children: 1 })).toBe('3 people')
    expect(describeParty({ adults: 1, children: 0 })).toBe('1 person')
  })
})
