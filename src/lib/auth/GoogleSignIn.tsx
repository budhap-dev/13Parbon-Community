import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useApi } from '@/lib/api'
import { useSession } from './session'
import {
  authClient,
  identityOf,
  isAllowed,
  readAuthConfig,
  sessionFor,
  signOutOfGoogle,
  startGoogleSignIn,
  type AuthConfig,
} from './supabaseAuth'

export type SignInState =
  /** No Supabase project, or nobody on the allowlist: the button says so and does nothing. */
  | { status: 'off' }
  | { status: 'ready' }
  | { status: 'working' }
  | { status: 'signedIn' }
  /** Signed in with Google, but not someone we let in. */
  | { status: 'refused'; email: string }
  | { status: 'failed'; message: string }

type Value = { state: SignInState; signIn: () => void; signOut: () => void }

const GoogleSignInContext = createContext<Value | null>(null)

/**
 * Turns a Google identity into an app session, and refuses one to anybody not invited.
 *
 * It sits between Supabase, which knows who signed in, and the session, which the rest of the
 * app reads. Being refused signs the person straight back out of Google as well, so a rejected
 * address does not sit there half-signed-in with a token in storage.
 */
export function GoogleSignInProvider({
  children,
  env = import.meta.env,
}: {
  children: ReactNode
  env?: Record<string, string | undefined>
}) {
  const config = useMemo(() => readAuthConfig(env), [env])
  const { session, signIn: putSession, signOut: dropSession } = useSession()
  const api = useApi()
  const [state, setState] = useState<SignInState>(config ? { status: 'ready' } : { status: 'off' })

  useEffect(() => {
    if (!config) return
    let live = true

    const settle = async (user: Parameters<typeof identityOf>[0]) => {
      const identity = identityOf(user)
      if (!identity) {
        if (live) setState({ status: 'ready' })
        return
      }
      if (!isAllowed(identity.email, config.allowlist)) {
        // Out of Google too, not just out of the app: a refused address should keep nothing.
        await signOutOfGoogle(config)
        dropSession()
        if (live) setState({ status: 'refused', email: identity.email })
        return
      }
      const household = await findHousehold(api, identity.email)
      if (!live) return
      putSession(sessionFor(identity, household))
      setState({ status: 'signedIn' })
    }

    // The listener fires for the session already in storage, so nothing else is needed on load.
    let stop: (() => void) | null = null
    void authClient(config).then((supabase) => {
      if (!live) return
      const { data } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
        void settle(supabaseSession?.user ?? null)
      })
      stop = () => data.subscription.unsubscribe()
    })

    return () => {
      live = false
      stop?.()
    }
  }, [config, api, putSession, dropSession])

  const signIn = useCallback(() => {
    if (!config) return
    setState({ status: 'working' })
    startGoogleSignIn(config).catch((error: unknown) => {
      setState({ status: 'failed', message: error instanceof Error ? error.message : 'Sign-in failed' })
    })
  }, [config])

  const signOut = useCallback(() => {
    dropSession()
    if (config) void signOutOfGoogle(config)
    setState(config ? { status: 'ready' } : { status: 'off' })
  }, [config, dropSession])

  const value = useMemo<Value>(
    () => ({
      state: session.role !== 'visitor' && state.status === 'ready' ? { status: 'signedIn' } : state,
      signIn,
      signOut,
    }),
    [session.role, state, signIn, signOut],
  )

  return <GoogleSignInContext.Provider value={value}>{children}</GoogleSignInContext.Provider>
}

export function useGoogleSignIn(): Value {
  const value = useContext(GoogleSignInContext)
  if (!value) throw new Error('useGoogleSignIn must be used inside <GoogleSignInProvider>')
  return value
}

/** The household the committee recorded this address against, if there is one yet. */
async function findHousehold(api: ReturnType<typeof useApi>, email: string) {
  try {
    const households = await api.portal.listHouseholds()
    const match = households.find((h) => h.googleEmail?.toLowerCase() === email.toLowerCase())
    return match ? { id: match.id, name: match.name, role: match.role } : null
  } catch {
    // The portal can say more about this than a sign-in can; getting in is the job here.
    return null
  }
}

export type { AuthConfig }
