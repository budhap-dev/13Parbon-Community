/**
 * Who may sign in while sign-in is being built.
 *
 * Membership is by invitation, and the long-term answer is the `googleEmail` on a household:
 * the committee records the address, and that address gets in. Until there are households to
 * match against, this env-configured list is the gate — set it to the developer's address
 * alone and nobody else can get a session, whatever they do at the Google prompt.
 *
 * Empty or unset means nobody: a build with Supabase configured but no list still shows the
 * sign-in as not switched on, rather than letting the first stranger with a Google account in.
 *
 *   VITE_MEMBER_ALLOWLIST=someone@example.com,someone.else@example.com
 *
 * To open it to everyone the committee has invited, drop the variable and let the household
 * lookup decide. Nothing here is a security boundary on its own — see the note in
 * supabaseAuth.ts.
 */
export function readAllowlist(env: Record<string, string | undefined>): string[] {
  return (env.VITE_MEMBER_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Whether this address may hold a session. Addresses are compared lowercased: Google returns
 * whatever case the person typed when they made the account.
 */
export function isAllowed(email: string | undefined | null, allowlist: string[]): boolean {
  if (!email) return false
  if (allowlist.length === 0) return false
  return allowlist.includes(email.trim().toLowerCase())
}
