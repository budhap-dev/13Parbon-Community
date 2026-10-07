import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '@/lib/api'
import { ApiProvider } from '@/lib/api/context'
import { GoogleSignInProvider } from './GoogleSignIn'
import { SESSION_STORAGE_KEY, SessionProvider, useSession, type SignedIn } from './session'

/**
 * Signing out in one tab, and the portal staying open in another.
 *
 * The app's session is per tab; Supabase's token is shared, and when it goes the listener in
 * every other tab hears "nobody is here". That used to set the page to "ready" and leave the
 * session standing — so the second tab went on showing the portal on a shared computer.
 */

type Listener = (event: string, session: { user: unknown } | null) => void
let listener: Listener | null = null

vi.mock('./supabaseAuth', async (importOriginal) => {
  const real = await importOriginal<typeof import('./supabaseAuth')>()
  return {
    ...real,
    signOutOfGoogle: async () => {},
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

const admin: SignedIn = {
  role: 'admin',
  householdId: 'hh-1',
  householdName: 'The Ones',
  name: 'Someone',
  email: 'someone@example.com',
}

const api = { portal: { identify: async () => null } } as unknown as ApiClient

function Who() {
  return <p>role: {useSession().session.role}</p>
}

function renderSignedIn(initial: SignedIn) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(initial))
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
  sessionStorage.clear()
})

describe('signing out in another tab', () => {
  it('signs this tab out of the portal too', async () => {
    renderSignedIn(admin)
    expect(screen.getByText('role: admin')).toBeInTheDocument()
    await vi.waitFor(() => expect(listener).not.toBeNull())

    await act(async () => listener!('SIGNED_OUT', null))

    expect(screen.getByText('role: visitor')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('leaves a sample-household preview alone, which never had a Google session', async () => {
    renderSignedIn({ ...admin, preview: true })
    await vi.waitFor(() => expect(listener).not.toBeNull())

    await act(async () => listener!('INITIAL_SESSION', null))

    expect(screen.getByText('role: admin')).toBeInTheDocument()
  })
})
