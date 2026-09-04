import { isAllowed, readAllowlist } from './allowlist'
import { identityOf, readAuthConfig, sessionFor } from './supabaseAuth'
import type { User } from '@supabase/supabase-js'

const project = { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' }

describe('who may sign in', () => {
  it('reads the list, ignoring spacing and case', () => {
    expect(readAllowlist({ VITE_MEMBER_ALLOWLIST: ' One@Example.com , two@example.com ' })).toEqual([
      'one@example.com',
      'two@example.com',
    ])
  })

  it('lets a listed address in whatever case Google returns it', () => {
    const list = ['dev@example.com']
    expect(isAllowed('DEV@Example.com', list)).toBe(true)
    expect(isAllowed('  dev@example.com  ', list)).toBe(true)
  })

  it('refuses anyone not on it', () => {
    expect(isAllowed('someone.else@example.com', ['dev@example.com'])).toBe(false)
    expect(isAllowed(undefined, ['dev@example.com'])).toBe(false)
    expect(isAllowed(null, ['dev@example.com'])).toBe(false)
  })

  it('refuses everyone when the list is empty, rather than admitting everyone', () => {
    // The dangerous default. An empty list must be a closed door, not an open one.
    expect(isAllowed('anyone@example.com', [])).toBe(false)
  })
})

describe('whether sign-in is switched on at all', () => {
  it('needs a project and at least one address', () => {
    expect(readAuthConfig({ ...project, VITE_MEMBER_ALLOWLIST: 'dev@example.com' })).toEqual({
      url: 'https://x.supabase.co',
      anonKey: 'anon',
      allowlist: ['dev@example.com'],
    })
  })

  it('stays off without a project', () => {
    expect(readAuthConfig({ VITE_MEMBER_ALLOWLIST: 'dev@example.com' })).toBeNull()
  })

  it('stays off with a project but nobody allowed', () => {
    // Otherwise the button would sign people in and immediately back out again.
    expect(readAuthConfig(project)).toBeNull()
    expect(readAuthConfig({ ...project, VITE_MEMBER_ALLOWLIST: '  ' })).toBeNull()
  })
})

describe('the person Google says is signed in', () => {
  const user = (extra: object) => ({ id: 'u1', ...extra }) as User

  it('prefers the full name Google gives', () => {
    expect(identityOf(user({ email: 'dev@example.com', user_metadata: { full_name: 'Rina Sen' } }))).toEqual({
      email: 'dev@example.com',
      name: 'Rina Sen',
    })
  })

  it('falls back to the part before the @ when there is no name', () => {
    expect(identityOf(user({ email: 'rina.sen@example.com', user_metadata: {} }))?.name).toBe('rina.sen')
  })

  it('is nobody without an address', () => {
    expect(identityOf(null)).toBeNull()
    expect(identityOf(user({ user_metadata: {} }))).toBeNull()
  })
})

describe('turning an identity into a session', () => {
  const identity = { email: 'dev@example.com', name: 'Rina Sen' }

  it('takes the household the committee recorded against the address', () => {
    expect(sessionFor(identity, { id: 'hh-sen', name: 'The Sens', role: 'member' })).toEqual({
      role: 'member',
      householdId: 'hh-sen',
      householdName: 'The Sens',
      name: 'Rina Sen',
      email: 'dev@example.com',
    })
  })

  it('still gets in with no household, which is where the developer starts', () => {
    const session = sessionFor(identity, null)
    expect(session.householdId).toBe('')
    expect(session.householdName).toBe('No household yet')
    expect(session.role).toBe('admin')
  })
})
