import { createContext, useContext } from 'react'
import type { Identity } from './supabaseAuth'

/**
 * Google, for a member of the public leaving feedback.
 *
 * Deliberately not the member sign-in, and the difference is the whole point of this file.
 * Membership is by invitation: `GoogleSignInProvider` checks an address against the allowlist,
 * looks up a household, and puts a `Session` in front of the portal. None of that applies
 * here. Signing in to sign a piece of feedback proves one thing — that a real Google account
 * stands behind these words — and it buys exactly one thing: a first name on the showcase, if
 * the committee approves it.
 *
 * So it creates no app session, reaches no household, and leaves the person a visitor
 * everywhere else on the site. It writes nothing to `sign_in_attempts` either: that table is
 * how the committee learns somebody is knocking at the portal, and a hundred people leaving
 * feedback are not a hundred membership enquiries.
 *
 * **What holds the line is not this file.** Everything here runs in a browser. An account with
 * no household reaches nothing in `supabase/portal.sql` — every policy asks
 * `portal.current_household_id() is not null` or `portal.is_admin()`, and a stranger's token
 * answers no to both. That is why opening Google sign-in to the public costs nothing: such a
 * token is worth no more than the anon key everywhere it matters.
 *
 * The state is filled in by `GoogleSignInProvider` rather than by a listener of its own. There
 * is one Supabase client, one stored token and one `onAuthStateChange` for the tab, and two
 * subscribers to it would be two answers to "who is here" that could disagree. It also keeps
 * the project settings in one place: a hook reaching for `import.meta.env` on its own reads
 * whatever is in `.env.local`, which in a test suite means the live project.
 */
export type PublicSignInState =
  /** No Supabase project in this build: no Google at all, and the form says so. */
  | { status: 'off' }
  /** Configured, and we do not yet know who is here — the moment after the return from Google. */
  | { status: 'checking' }
  | { status: 'ready' }
  | { status: 'working' }
  | { status: 'signedIn'; identity: Identity }
  | { status: 'failed'; message: string }

export type PublicSignIn = {
  state: PublicSignInState
  /** Sends them to Google, and back to the page they were on. */
  signIn: () => void
  /** Out of Google, but no further: there was never an app session to drop. */
  signOut: () => void
}

const off: PublicSignIn = { state: { status: 'off' }, signIn: () => {}, signOut: () => {} }

export const PublicSignInContext = createContext<PublicSignIn>(off)

/**
 * Whether this visitor can put a name to what they write, and who that name belongs to.
 *
 * Falls back to "off" outside a provider rather than throwing, unlike `useGoogleSignIn`. The
 * member sign-in is the portal's front door and a component asking for it outside its provider
 * is a wiring mistake worth failing loudly on; this is one optional decoration on one public
 * form, and a page that renders it as "signing in is not available" is not broken.
 */
export function usePublicSignIn(): PublicSignIn {
  return useContext(PublicSignInContext)
}
