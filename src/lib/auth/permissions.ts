import { isAdmin, isMember, type Viewer } from '@/domain/household'

/**
 * One place that answers "may they?".
 *
 * Three things enforce the same rules, and they are not interchangeable:
 *
 *   `supabase/portal.sql`  what the database will actually hand over. The only one that counts.
 *   `lib/api/mock`         what the app develops against, written to refuse the same things.
 *   `can()`                what the interface offers — which button to draw, which route to let
 *                          somebody walk into.
 *
 * This one is the weakest of the three and is meant to be. It runs in the browser, so it
 * decides what the app *shows*, never what anybody can *reach*: a person who edits their own
 * JavaScript can make every `can()` return true and will still get nothing back, because the
 * policies do not ask this file's opinion. Its job is to stop somebody being offered a button
 * that was only ever going to fail.
 *
 * Every rule below names the policy it mirrors. When they disagree, the database is right and
 * this file is the bug — `mock/rules.test.ts` and `supabase/verify.sql` exist to notice.
 */

export type Action =
  /** Walk into the member portal at all. */
  | 'portal:enter'
  /** Walk into the committee's back office. */
  | 'admin:enter'
  /** Read one household. Needs `householdId`. */
  | 'household:read'
  /** Edit the parts of a household that belong to the household. Needs `householdId`. */
  | 'household:edit'
  /** Add a household — the whole invitation model in one action. */
  | 'household:add'
  | 'household:remove'
  /** Read every household, as a list. */
  | 'households:list'
  /**
   * The three things a member may not change about themselves, even on their own row.
   * Row level security decides rows, not columns, so in the database these are a trigger.
   */
  | 'household:setRole'
  | 'household:setSignInAddress'
  | 'household:setMembership'
  | 'directory:read'
  | 'documents:read'
  | 'documents:manage'
  /** Read how many came to each event. Numbers only; there is nobody in them. */
  | 'attendance:read'
  /** Record how many came. */
  | 'attendance:record'
  | 'signInAttempts:read'
  | 'signInAttempts:resolve'
  | 'messages:read'
  | 'messages:handle'

/** What the action is about, where the answer depends on which one. */
export type Resource = { householdId?: string }

/** Whether this viewer's own household is the one in question. */
function isOwn(viewer: Viewer, resource?: Resource): boolean {
  return isMember(viewer) && resource?.householdId === viewer.householdId
}

/**
 * Whether this viewer may do this.
 *
 * Unknown combinations are refused rather than allowed: a new action added to the union
 * without a rule here returns false, which shows up as a button that does nothing rather
 * than as a door left open.
 */
export function can(viewer: Viewer, action: Action, resource?: Resource): boolean {
  // Nobody signed in reaches any of this. Mirrors: everything is `to authenticated`, and
  // anon holds no grant on any portal table.
  if (!isMember(viewer)) return false

  // The committee may do everything a member may, and the rest besides. Mirrors:
  // `or public.is_admin()` on every policy.
  if (isAdmin(viewer)) return true

  switch (action) {
    // Mirrors: policy "read own household" / "update own household".
    case 'household:read':
    case 'household:edit':
      return isOwn(viewer, resource)

    // Mirrors: the directory view's `current_household_id() is not null`, and policy
    // "members read documents".
    case 'portal:enter':
    case 'directory:read':
    case 'documents:read':
    // Mirrors: policy "members read attendance". A count has nobody in it.
    case 'attendance:read':
      return true

    // Mirrors: policy "admins add households" / "admins remove households", policy
    // "admins manage documents", the admin-only reads, and the trigger
    // households_guard_protected_columns for the three protected columns.
    case 'admin:enter':
    case 'household:add':
    case 'household:remove':
    case 'households:list':
    case 'household:setRole':
    case 'household:setSignInAddress':
    case 'household:setMembership':
    case 'documents:manage':
    case 'attendance:record':
    case 'signInAttempts:read':
    case 'signInAttempts:resolve':
    case 'messages:read':
    case 'messages:handle':
      return false
  }
}

/**
 * The last admin may not be removed or demoted, and nobody may do either to themselves.
 *
 * Not a `can()` rule, because it does not depend on who is asking — it is true of the
 * committee as a whole. Kept here so the one place that answers "may they?" answers this too.
 *
 * There is no policy mirroring this yet: it wants a constraint or a trigger of its own, and
 * until there is one, this is a courtesy rather than a guarantee. A committee that locks
 * itself out has no way back in that does not involve the SQL editor.
 */
export function canStopBeingAdmin(viewer: Viewer, householdId: string, adminCount: number): boolean {
  if (!isAdmin(viewer)) return false
  if (adminCount <= 1) return false
  return viewer.householdId !== householdId
}
