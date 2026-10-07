/**
 * Addresses let in without a household.
 *
 * Membership is by invitation, and the answer for members is the `googleEmail` on a household:
 * the committee records the address on the People screen, and that address gets in. This list
 * is for the few who have no household to be found by — the developer's own address — and an
 * address on it with no household comes in as an admin (see `sessionFor`).
 *
 * It is also the switch for the members' door. Empty or unset means the door is off: a build
 * with Supabase configured but no list shows sign-in as not switched on, rather than opening
 * to whoever the database happens to hold.
 *
 *   VITE_MEMBER_ALLOWLIST=someone@example.com,someone.else@example.com
 *
 * Until 2026-10-07 this list was the only gate, so a household added in the portal still could
 * not sign in without an edit here and a redeploy. Nothing here is a security boundary on its
 * own — see the note in supabaseAuth.ts.
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
