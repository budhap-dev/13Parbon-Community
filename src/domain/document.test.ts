import { describe, expect, it } from 'vitest'
import { unresolved, type SignInAttempt } from './document'
import { signInAddresses } from './household'

const knock = (email: string, resolved = false): SignInAttempt => ({
  id: email,
  email,
  name: 'Someone',
  lastTriedAt: '2026-10-16T10:00:00',
  attempts: 1,
  resolved,
})

describe('the knocks still wanting an answer', () => {
  const households = [
    { googleEmail: 'rina.sen@gmail.com', people: [{ googleEmail: 'arjun.sen@gmail.com' }, {}] },
    { googleEmail: null, people: [] },
  ]

  it('drops one answered by a household, by a person linked to one, or by Ignore', () => {
    const left = unresolved(
      [knock('Rina.Sen@gmail.com'), knock('arjun.sen@gmail.com'), knock('gone@gmail.com', true), knock('new@gmail.com')],
      households,
    )
    expect(left.map((k) => k.email)).toEqual(['new@gmail.com'])
  })

  it('knows every address that signs in as a household, its own first', () => {
    expect(signInAddresses({ googleEmail: 'Rina.Sen@gmail.com', people: [{ googleEmail: ' Arjun@Gmail.com' }, {}] })).toEqual([
      'rina.sen@gmail.com',
      'arjun@gmail.com',
    ])
    expect(signInAddresses({ googleEmail: null, people: [] })).toEqual([])
  })
})
