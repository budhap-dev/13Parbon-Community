import { isValidApplication, validateApplication } from './membership'

const good = { householdName: 'The Sens', contactName: 'Rina Sen', email: 'rina@example.com', phone: '', adults: 2, children: 1, message: '' }

describe('validateApplication', () => {
  it('accepts a complete application, phone and message optional', () => {
    expect(validateApplication(good)).toEqual({})
    expect(isValidApplication(good)).toBe(true)
  })

  it('flags missing names, a bad email and impossible counts', () => {
    const errors = validateApplication({ ...good, householdName: '', contactName: ' ', email: 'x', adults: 0, children: -1 })
    expect(Object.keys(errors).sort()).toEqual(['adults', 'children', 'contactName', 'email', 'householdName'])
  })
})
