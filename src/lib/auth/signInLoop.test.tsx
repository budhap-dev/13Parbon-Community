import { render, screen, waitFor } from '@testing-library/react'
import { useCallback, useContext, useEffect, useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequireSession } from '@/app/layouts/RequireSession'
import type { ApiClient } from '@/lib/api'
import { ApiProvider } from '@/lib/api/context'
import { GoogleSignInProvider } from './GoogleSignIn'
import { PublicSignInContext } from './publicSignIn'
import { SessionProvider } from './session'

/**
 * The portal stuck on "Signing you in…", on the deployed preview and nowhere else.
 *
 * In a production build `import.meta.env` is an object literal written out wherever it is
 * used, so the provider's default parameter was a new object on every render. The effect that
 * subscribes to Supabase keys on the settings read from it, and the callback updates state
 * before its household lookup has finished — so every render re-ran the effect, which dropped
 * the lookup and started again. Forty subscriptions in two seconds, and a screen that never
 * changed. Tests and the dev server both hand the provider one object and keep it, which is
 * why nothing here had seen it; this harness does what the build does.
 */

let subscriptions = 0
let sdkLoads: 'ok' | 'fails' = 'ok'
const user = { email: 'someone@example.com', user_metadata: { full_name: 'Someone' } }

vi.mock('./supabaseAuth', async (importOriginal) => {
  const real = await importOriginal<typeof import('./supabaseAuth')>()
  return {
    ...real,
    signOutOfGoogle: async () => {},
    authClient: async () => {
      if (sdkLoads === 'fails') throw new Error('Failed to fetch dynamically imported module')
      return {
        auth: {
          onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
            subscriptions += 1
            // As the real client does: the stored session arrives a moment after subscribing.
            // Capped, so that if the loop ever comes back this test fails rather than runs
            // until the suite is killed.
            if (subscriptions <= 200) setTimeout(() => cb('INITIAL_SESSION', { user }), 0)
            return { data: { subscription: { unsubscribe: () => {} } } }
          },
          getSession: async () => ({ data: { session: { user } } }),
        },
      }
    },
  }
})

const configured = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
  VITE_MEMBER_ALLOWLIST: 'someone@example.com',
}

/** The lookup takes a moment, as a request to the database does. The loop lived in that moment. */
const api = {
  portal: {
    identify: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return null
    },
  },
} as unknown as ApiClient

/**
 * Re-renders the parent whenever the provider's public state changes. In the build the
 * provider's own `setPublicState` does this to itself; from outside, this is the nearest thing.
 */
function RerenderOnChange({ onChange }: { onChange: () => void }) {
  const state = useContext(PublicSignInContext)?.state
  useEffect(() => onChange(), [state, onChange])
  return null
}

function Portal() {
  const [, bump] = useState(0)
  const onChange = useCallback(() => bump((n) => n + 1), [])
  const [router] = useState(() =>
    createMemoryRouter(
      [
        { element: <RequireSession />, children: [{ path: '/portal', element: <h1>Dashboard</h1> }] },
        { path: '/login', element: <h1>Sign in</h1> },
      ],
      { initialEntries: ['/portal'] },
    ),
  )
  return (
    <SessionProvider>
      <ApiProvider api={api}>
        {/* A fresh object every render — exactly what the production build hands the provider. */}
        <GoogleSignInProvider env={{ ...configured }}>
          <RerenderOnChange onChange={onChange} />
          <RouterProvider router={router} />
        </GoogleSignInProvider>
      </ApiProvider>
    </SessionProvider>
  )
}

afterEach(() => {
  subscriptions = 0
  sdkLoads = 'ok'
})

describe('coming back to the portal with a session, in a production build', () => {
  it('signs in, rather than starting the lookup over on every render', async () => {
    render(<Portal />)
    expect(await screen.findByRole('heading', { name: 'Dashboard' }, { timeout: 3000 })).toBeInTheDocument()
    // One subscription for the tab. Before the fix this was forty-odd and climbing.
    expect(subscriptions).toBeLessThanOrEqual(2)
  })

  it('stops waiting when the sign-in SDK cannot be loaded at all', async () => {
    sdkLoads = 'fails'
    render(<Portal />)
    // The guard sends them to the sign-in page, which says what went wrong. Before this,
    // "checking" with no listener coming was a screen nobody ever left.
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument())
    expect(screen.queryByText('Signing you in…')).not.toBeInTheDocument()
  })
})
