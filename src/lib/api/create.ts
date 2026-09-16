import { withAuditTrail } from './audit'
import { createMockApi } from './mock'
import { readSupabaseConfig, withSupabaseWrites } from './supabase'
import { withSupabasePortal } from './supabase/portal'
import { withSupabaseAudit } from './supabase/audit'
import { withSupabaseNews } from './supabase/news'
import { withSupabaseSettings } from './supabase/settings'
import type { ApiClient } from './types'

/**
 * The client the app runs on.
 *
 * With no project configured it is fixtures throughout, and `delivers` is false so the contact
 * form offers an email address rather than pretending a message was sent. With one, everything
 * the committee can change from the portal is real except the gallery and events: the gallery
 * because adding and removing a photograph both need the bucket, and events because they belong
 * to the committee's separate planner app and how they cross has not been settled.
 *
 * The audit wrapper goes outermost, so a write is recorded whichever layer ends up handling it.
 */
export function createApi(env: Record<string, string | undefined> = import.meta.env): ApiClient {
  const base = createMockApi()
  const config = readSupabaseConfig(env)
  if (!config) return withAuditTrail(base)
  const live = withSupabaseNews(
    withSupabaseSettings(withSupabasePortal(withSupabaseWrites(base, config), config), config),
    config,
  )
  /*
   * The audit read goes outside the audit wrapper, which keeps its own list in memory and would
   * otherwise answer from it. Its recording stays: the trigger is the guarantee, this is the
   * belt, and the contract test insists every write goes through one of them.
   */
  return withSupabaseAudit(withAuditTrail(live), config)
}
