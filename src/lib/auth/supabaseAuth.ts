import type { SupabaseClient, User } from '@supabase/supabase-js'
import { readSupabaseConfig, type SupabaseConfig } from '@/lib/api/supabase'
import { isAllowed, readAllowlist } from './allowlist'
import type { SignedIn } from './session'
import type { Role } from '@/domain/household'

/**
 * Google sign-in through Supabase.
 *
 * **What the allowlist is not.** Everything here runs in the browser, so it decides what the
 * app *shows*, not what the database *gives out*. Anyone able to run JavaScript can hold a
 * session for an address that is not on it.
 *
 * What stops them reaching anything is `supabase/portal.sql`, which has been run and verified
 * against the real database: a signed-in account reaches its own household and nothing else,
 * whatever this file thinks. The allowlist is a gate on the door, not the lock.
 */

export type AuthConfig = { url: string; anonKey: string; allowlist: string[] }

/**
 * The same client, for reading data.
 *
 * Deliberately the same one: it holds the session, so every query carries the signed-in
 * person's token and the policies answer for them. A second client would have its own idea of
 * who is here, and a request with the anon key does not fail — it returns nothing, which looks
 * like an empty account.
 *
 * It takes only the project settings, because reading data does not depend on the allowlist —
 * that decides who may hold a session, not what a session can reach.
 */
export const dataClient = authClient

/** Settings for real sign-in, or null when this build has none and should stay switched off. */
export function readAuthConfig(env: Record<string, string | undefined>): AuthConfig | null {
  const supabase = readSupabaseConfig(env)
  if (!supabase) return null
  const allowlist = readAllowlist(env)
  // A configured project with nobody allowed in is not a working sign-in, and saying so is
  // better than offering a button that signs people in and immediately back out again.
  if (allowlist.length === 0) return null
  return { ...supabase, allowlist }
}

let client: Promise<SupabaseClient> | null = null

/**
 * One client for the tab, and the SDK fetched only when it is needed.
 *
 * Imported statically it added 57 KB gzipped to what every visitor downloads, for a sign-in
 * that most of them will never use and that is switched off in builds without a project. As a
 * dynamic import it stays out of the main bundle until somebody actually signs in.
 */
export function authClient(config: SupabaseConfig): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The OAuth redirect comes back with the code in the URL; this is what reads it.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }),
  )
  return client
}

/** Sends the viewer to Google, and back to the portal afterwards. */
export async function startGoogleSignIn(config: AuthConfig, returnTo = '/portal'): Promise<void> {
  const supabase = await authClient(config)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${returnTo}`,
      // No offline access and no extra scopes: the name and the address are all this needs.
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) throw error
}

/**
 * The signed-in person's token, for a request that goes somewhere other than PostgREST.
 *
 * The photo function verifies the caller by asking the database `is_admin()` with this, so it
 * carries the same identity every other request does. Null when nobody is signed in.
 */
export async function accessToken(config: SupabaseConfig): Promise<string | null> {
  const { data } = await (await authClient(config)).auth.getSession()
  return data.session?.access_token ?? null
}

export async function signOutOfGoogle(config: AuthConfig): Promise<void> {
  await (await authClient(config)).auth.signOut()
}

export type Identity = { email: string; name: string }

/** The person Google says is signed in, or null. */
export function identityOf(user: User | null): Identity | null {
  const email = user?.email
  if (!email) return null
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined
  return { email, name: meta?.full_name || meta?.name || email.split('@')[0] }
}

/**
 * What an identity becomes once we know whether it is welcome. Households are matched on the
 * `googleEmail` the committee recorded; an allowed address with no household still gets in,
 * because the developer's own address will not have one until there is data to put it in.
 */
export type Household = { id: string; name: string; role: Role }

export function sessionFor(identity: Identity, household: Household | null): SignedIn {
  return {
    role: household?.role ?? 'admin',
    householdId: household?.id ?? '',
    householdName: household?.name ?? 'No household yet',
    name: identity.name,
    email: identity.email,
  }
}

export { isAllowed }
