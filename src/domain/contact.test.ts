import { isValidContact, validateContact } from './contact'

const good = { name: 'Rina Sen', email: 'rina@example.com', subject: 'Parking', message: 'Where do we park on the night?' }

describe('validateContact', () => {
  it('accepts a complete message', () => {
    expect(validateContact(good)).toEqual({})
    expect(isValidContact(good)).toBe(true)
  })

  it('flags each missing or malformed field', () => {
    const errors = validateContact({ name: ' ', email: 'not-an-email', subject: '', message: 'short' })
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name', 'subject'])
    expect(isValidContact({ ...good, email: 'rina@' })).toBe(false)
  })
})
