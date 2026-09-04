import type { SupabaseClient, User } from '@supabase/supabase-js'
import { readSupabaseConfig } from '@/lib/api/supabase'
import { isAllowed, readAllowlist } from './allowlist'
import type { SignedIn } from './session'
import type { Role } from '@/domain/household'

/**
 * Google sign-in through Supabase.
 *
 * **What this is not.** Everything here runs in the browser, so the allowlist decides what
 * the app *shows*, not what the database *gives out*. Anyone able to run JavaScript can hold
 * a session for an address that is not on the list. That is acceptable while the portal reads
 * from fixtures and there is nothing real to protect — but before a single household's details
 * go into Supabase, row level security has to enforce the same rule server-side, because this
 * cannot. See supabase/portal.sql, which is drafted and not yet correct.
 */

export type AuthConfig = { url: string; anonKey: string; allowlist: string[] }

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
export function authClient(config: AuthConfig): Promise<SupabaseClient> {
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
