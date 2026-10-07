/**
 * What somebody went to Google *for*.
 *
 * There is one Supabase project, one OAuth flow and one stored token, and now two quite
 * different reasons to use them: a member opening their own household, and a member of the
 * public putting their name to a piece of feedback. The token cannot tell them apart, and the
 * difference matters because of what the member sign-in does with an address it does not
 * recognise — it signs that account straight back out of Google, which is right for somebody
 * knocking at the portal door and catastrophic for somebody who has just signed in to leave
 * feedback and is about to press Send.
 *
 * So the app remembers which door was used. Written before the redirect, read on the way back.
 *
 * `localStorage`, deliberately, because that is where Supabase keeps the session it belongs to:
 * anything shorter-lived would forget the purpose while the token it describes was still valid,
 * and the next page load would treat a feedback account as a stranger at the portal.
 *
 * Nothing here is a security boundary. It decides how the app treats its own token, not what
 * the database will hand over — see the note at the top of `supabaseAuth.ts`.
 */
export type SignInPurpose = 'member' | 'feedback'

export const PURPOSE_STORAGE_KEY = '13parbon:sign-in-purpose'

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function rememberPurpose(purpose: SignInPurpose): void {
  try {
    storage()?.setItem(PURPOSE_STORAGE_KEY, purpose)
  } catch {
    // Private mode or blocked storage. Falls back to 'member', which is the older behaviour.
  }
}

/**
 * Why the stored session exists. `member` when nothing was recorded — the cautious answer,
 * because it is the one that turns an unrecognised address away rather than tolerating it.
 */
export function purposeNow(): SignInPurpose {
  try {
    return storage()?.getItem(PURPOSE_STORAGE_KEY) === 'feedback' ? 'feedback' : 'member'
  } catch {
    return 'member'
  }
}

export function forgetPurpose(): void {
  try {
    storage()?.removeItem(PURPOSE_STORAGE_KEY)
  } catch {
    // Nothing to do. A purpose left behind outlives its session at worst.
  }
}
