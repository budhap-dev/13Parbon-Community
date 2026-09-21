import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApi } from '@/lib/api'
import { readSupabaseConfig } from '@/lib/api/supabase'
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
import { forgetPurpose, purposeNow, rememberPurpose } from './signInPurpose'
import { PublicSignInContext, type PublicSignIn, type PublicSignInState } from './publicSignIn'

export type SignInState =
  /** No Supabase project, or nobody on the allowlist: the button says so and does nothing. */
  | { status: 'off' }
  /**
   * Configured, and we do not yet know who is here.
   *
   * There is a moment after the return from Google where the client is still reading the code
   * out of the address bar. Treating that as "a visitor" is what sent somebody who had just
   * signed in back to the sign-in page.
   */
  | { status: 'checking' }
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
 *
 * It also serves the public sign-in on the feedback page, through `PublicSignInContext`. One
 * provider rather than two, because there is one Supabase client, one stored token and one
 * `onAuthStateChange` for the tab — two subscribers would be two answers to "who is here"
 * that could disagree, and the pair of them would race to sign each other out.
 *
 * The two doors read different settings, and that difference is the feature:
 *
 *   `readAuthConfig`     the members' door. Null with no project *or* nobody on the allowlist,
 *                        because a members' door that opens for nobody is not a door.
 *   `readSupabaseConfig` whether there is a Google at all. The public door has no list: anybody
 *                        with an account may put their first name to what they wrote.
 */
export function GoogleSignInProvider({
  children,
  env = import.meta.env,
}: {
  children: ReactNode
  env?: Record<string, string | undefined>
}) {
  const config = useMemo(() => readAuthConfig(env), [env])
  const project = useMemo(() => readSupabaseConfig(env), [env])
  const { session, signIn: putSession, signOut: dropSession } = useSession()
  const api = useApi()
  const [state, setState] = useState<SignInState>(config ? { status: 'checking' } : { status: 'off' })
  /**
   * Whoever Google says is here, allowlist or no allowlist.
   *
   * Kept separately from `state` because the two questions have different answers: an address
   * with no household is nobody as far as the portal is concerned and a perfectly good person
   * to sign a piece of feedback.
   */
  const [publicState, setPublicState] = useState<PublicSignInState>(
    project ? { status: 'checking' } : { status: 'off' },
  )

  /*
   * Read through a ref rather than closed over, because the listener below is subscribed once
   * and would otherwise go on seeing whatever the session was when it was set up.
   */
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    // No project at all: there is no Google here, by either door.
    if (!project) return
    let live = true

    const settle = async (user: Parameters<typeof identityOf>[0]) => {
      const identity = identityOf(user)
      /*
       * The public half first, and unconditionally. It asks only "is a Google account here,
       * and what is it called" — a question the allowlist has no bearing on, and one that has
       * an answer even in a build where the members' door is switched off entirely.
       */
      if (live) setPublicState(identity ? { status: 'signedIn', identity } : { status: 'ready' })

      // The members' door needs an allowlist to be a door. Without one, nothing below applies
      // and `state` stays 'off', which is what the sign-in page already says.
      if (!config) return

      /*
       * An admin walking through the sample households has deliberately stepped out of their
       * own account. This listener fires for the session already in storage — on load, and
       * again whenever it is re-subscribed — so without this it would put the real session
       * straight back and throw them out of the preview they had just opened.
       */
      const current = sessionRef.current
      if (current.role !== 'visitor' && current.preview) {
        if (live) setState({ status: 'signedIn' })
        return
      }
      if (!identity) {
        if (live) setState({ status: 'ready' })
        return
      }
      if (!isAllowed(identity.email, config.allowlist)) {
        /*
         * Somebody who went to Google to sign a piece of feedback is not knocking at the
         * portal, and must not be treated as though they were. Turning them away here would
         * sign them out of the account they are about to put their name to — the button on
         * the feedback form would appear to do nothing, over and over.
         *
         * They stay exactly what they were to the rest of the app: a visitor. The session is
         * left alone for `usePublicSignIn` to read the name off, and it opens no door —
         * an address with no household reaches nothing in the database.
         */
        if (purposeNow() === 'feedback') {
          if (live) setState({ status: 'ready' })
          return
        }
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
    void authClient(project).then((supabase) => {
      if (!live) return
      const { data } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
        void settle(supabaseSession?.user ?? null)
      })
      // If nothing is stored and nothing is in the address bar, the listener may never fire.
      // Ask once, so "checking" cannot become a state the page never leaves — which on the
      // feedback form shows as a sign-in button disabled for no visible reason.
      void supabase.auth.getSession().then(({ data: current }) => {
        if (!live || current.session) return
        setState((s) => (s.status === 'checking' ? { status: 'ready' } : s))
        setPublicState((s) => (s.status === 'checking' ? { status: 'ready' } : s))
      })
      stop = () => data.subscription.unsubscribe()
    })

    return () => {
      live = false
      stop?.()
    }
  }, [project, config, api, putSession, dropSession])

  const signIn = useCallback(() => {
    if (!config) return
    setState({ status: 'working' })
    // Which door this is. Read on the way back from Google, where an unrecognised address is
    // turned away from the portal but left alone if it came to sign a piece of feedback.
    rememberPurpose('member')
    startGoogleSignIn(config).catch((error: unknown) => {
      setState({ status: 'failed', message: error instanceof Error ? error.message : 'Sign-in failed' })
    })
  }, [config])

  const signOut = useCallback(() => {
    forgetPurpose()
    dropSession()
    if (config) void signOutOfGoogle(config)
    setState(config ? { status: 'ready' } : { status: 'off' })
  }, [config, dropSession])

  /**
   * The public door. Same Google, same token, none of the consequences.
   *
   * `returnTo` is the feedback page rather than the portal: coming back to a sign-in they did
   * not ask for, having lost what they had typed, is how somebody stops leaving feedback.
   */
  const publicSignIn = useCallback(() => {
    if (!project) return
    setPublicState({ status: 'working' })
    /*
     * Recorded before the redirect, because the way back goes through a page load and storage
     * is the only thing that survives it. Without this the members' gate above meets an
     * address it does not recognise on the return, decides somebody is knocking at the portal,
     * and signs the account out of Google again — a button that appears to do nothing at all.
     */
    rememberPurpose('feedback')
    startGoogleSignIn(project, '/feedback').catch((error: unknown) => {
      setPublicState({ status: 'failed', message: error instanceof Error ? error.message : 'Sign-in failed' })
    })
  }, [project])

  const publicSignOut = useCallback(() => {
    if (!project) return
    forgetPurpose()
    setPublicState({ status: 'ready' })
    void signOutOfGoogle(project)
  }, [project])

  const publicValue = useMemo<PublicSignIn>(
    () => ({ state: publicState, signIn: publicSignIn, signOut: publicSignOut }),
    [publicState, publicSignIn, publicSignOut],
  )

  const value = useMemo<Value>(
    () => ({
      state: session.role !== 'visitor' && state.status === 'ready' ? { status: 'signedIn' } : state,
      signIn,
      signOut,
    }),
    [session.role, state, signIn, signOut],
  )

  return (
    <GoogleSignInContext.Provider value={value}>
      <PublicSignInContext.Provider value={publicValue}>{children}</PublicSignInContext.Provider>
    </GoogleSignInContext.Provider>
  )
}

export function useGoogleSignIn(): Value {
  const value = useContext(GoogleSignInContext)
  if (!value) throw new Error('useGoogleSignIn must be used inside <GoogleSignInProvider>')
  return value
}

/** The household the committee recorded this address against, if there is one yet. */
async function findHousehold(api: ReturnType<typeof useApi>, email: string) {
  try {
    return await api.portal.identify(email)
  } catch {
    // The portal can say more about this than a sign-in can; getting in is the job here.
    return null
  }
}

export type { AuthConfig }

/**
 * Whether the app is still working out who is here.
 *
 * A guard that asks "is somebody signed in?" during this moment gets "no" and acts on it. It
 * should wait instead: the answer is coming, and it is often yes.
 */
export function useAuthSettling(): boolean {
  return useGoogleSignIn().state.status === 'checking'
}
