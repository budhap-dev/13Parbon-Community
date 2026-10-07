import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '@/lib/api'
import { ApiProvider } from '@/lib/api/context'
import { GoogleSignInProvider, useGoogleSignIn } from './GoogleSignIn'
import { SESSION_STORAGE_KEY, SessionProvider, useSession } from './session'

/**
 * A household lookup that failed, and a sign-in that took it for "not recorded".
 *
 * The lookup's error used to be swallowed into null, and null is what an invited address with
 * no household gets: a session called "No household yet", and a portal telling somebody the
 * committee had never heard of them — over nothing worse than a dropped connection.
 */

type Listener = (event: string, session: { user: unknown } | null) => void
let listener: Listener | null = null
let signOutFails = false
const signOutOfGoogle = vi.fn(async () => {
  // As the real client does: the sign-out tells the listener nobody is here before it returns.
  listener?.('SIGNED_OUT', null)
  if (signOutFails) throw new Error('network down')
})

vi.mock('./supabaseAuth', async (importOriginal) => {
  const real = await importOriginal<typeof import('./supabaseAuth')>()
  return {
    ...real,
    signOutOfGoogle: () => signOutOfGoogle(),
    authClient: async () => ({
      auth: {
        onAuthStateChange: (cb: Listener) => {
          listener = cb
          return { data: { subscription: { unsubscribe: () => {} } } }
        },
        getSession: async () => ({ data: { session: { user: {} } } }),
      },
    }),
  }
})

const configured = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
  VITE_MEMBER_ALLOWLIST: 'someone@example.com',
}

const user = (email: string) => ({ email, user_metadata: { full_name: 'Someone' } })

function Who() {
  const { state } = useGoogleSignIn()
  const { session } = useSession()
  return (
    <>
      <p>state: {state.status}</p>
      {state.status === 'failed' ? <p>message: {state.message}</p> : null}
      <p>household: {session.role === 'visitor' ? 'none' : session.householdName}</p>
    </>
  )
}

function renderWith(identify: () => Promise<unknown>) {
  const api = { portal: { identify } } as unknown as ApiClient
  render(
    <SessionProvider>
      <ApiProvider api={api}>
        <GoogleSignInProvider env={configured}>
          <Who />
        </GoogleSignInProvider>
      </ApiProvider>
    </SessionProvider>,
  )
}

afterEach(() => {
  listener = null
  signOutFails = false
  signOutOfGoogle.mockClear()
  sessionStorage.clear()
})

describe('a household lookup that could not be made', () => {
  it('ends in the failed state, not a session with no household', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWith(async () => {
      throw new Error('Your household could not be looked up: fetch failed')
    })
    await vi.waitFor(() => expect(listener).not.toBeNull())

    await act(async () => listener!('SIGNED_IN', { user: user('someone@example.com') }))

    expect(screen.getByText('state: failed')).toBeInTheDocument()
    expect(
      screen.getByText('message: we could not check your household just now'),
    ).toBeInTheDocument()
    // Nobody left half in: no app session, and out of Google too.
    expect(screen.getByText('household: none')).toBeInTheDocument()
    expect(screen.queryByText(/No household yet/)).not.toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(signOutOfGoogle).toHaveBeenCalledTimes(1)
  })

  it('still lets in an invited address the database answered for with no household', async () => {
    renderWith(async () => null)
    await vi.waitFor(() => expect(listener).not.toBeNull())

    await act(async () => listener!('SIGNED_IN', { user: user('someone@example.com') }))

    expect(screen.getByText('state: signedIn')).toBeInTheDocument()
    expect(screen.getByText('household: No household yet')).toBeInTheDocument()
    expect(signOutOfGoogle).not.toHaveBeenCalled()
  })
})

describe('a member already in, checked again', () => {
  /*
   * Supabase asks again on every token refresh, about hourly. One dropped request then must not
   * sign out somebody halfway through a form: the household found at sign-in still stands.
   */
  it('stays signed in when the lookup fails on a refresh', async () => {
    let down = false
    renderWith(async () => {
      if (down) throw new Error('fetch failed')
      return { id: 'hh-1', name: 'The Sens', role: 'member' }
    })
    await vi.waitFor(() => expect(listener).not.toBeNull())
    await act(async () => listener!('SIGNED_IN', { user: user('someone@example.com') }))
    expect(screen.getByText('household: The Sens')).toBeInTheDocument()

    down = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => listener!('TOKEN_REFRESHED', { user: user('someone@example.com') }))

    expect(screen.getByText('state: signedIn')).toBeInTheDocument()
    expect(screen.getByText('household: The Sens')).toBeInTheDocument()
    expect(signOutOfGoogle).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})

/*
 * The household is what lets a member in. The allowlist used to be the only gate, so somebody
 * the committee had added on the People screen was still turned away until a hosting setting
 * was edited and the site rebuilt.
 */
describe('an address the committee has added to a household', () => {
  it('is let in without being on the allowlist, as the household it belongs to', async () => {
    renderWith(async () => ({ id: 'hh-roy', name: 'The Roys', role: 'member' }))
    await vi.waitFor(() => expect(listener).not.toBeNull())

    await act(async () => listener!('SIGNED_IN', { user: user('ami.subhendu@gmail.com') }))

    expect(screen.getByText('state: signedIn')).toBeInTheDocument()
    expect(screen.getByText('household: The Roys')).toBeInTheDocument()
    expect(signOutOfGoogle).not.toHaveBeenCalled()
  })

  it('is told the check failed, not that nobody has heard of them, when the lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWith(async () => {
      throw new Error('fetch failed')
    })
    await vi.waitFor(() => expect(listener).not.toBeNull())

    await act(async () => listener!('SIGNED_IN', { user: user('ami.subhendu@gmail.com') }))

    expect(screen.getByText('state: failed')).toBeInTheDocument()
    expect(screen.getByText('household: none')).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})

describe('an address that is not invited', () => {
  it('is still refused when signing it out of Google fails', async () => {
    signOutFails = true
    renderWith(async () => null)
    await vi.waitFor(() => expect(listener).not.toBeNull())

    await act(async () => listener!('SIGNED_IN', { user: user('stranger@example.com') }))

    expect(screen.getByText('state: refused')).toBeInTheDocument()
    expect(screen.getByText('household: none')).toBeInTheDocument()
  })
})
