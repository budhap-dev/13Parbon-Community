import { withAuditTrail } from './audit'
import { createMockApi } from './mock'
import { readSupabaseConfig, withSupabaseWrites } from './supabase'
import { withSupabasePortal } from './supabase/portal'
import { withSupabaseSettings } from './supabase/settings'
import type { ApiClient } from './types'

/**
 * The client the app runs on.
 *
 * With no project configured it is fixtures throughout, and `delivers` is false so the contact
 * form offers an email address rather than pretending a message was sent. With one, the portal,
 * the contact form and the site's own switches are real, and the rest — events, news, the
 * gallery — is still fixtures, because those have no tables yet.
 *
 * The audit wrapper goes outermost, so a write is recorded whichever layer ends up handling it.
 */
export function createApi(env: Record<string, string | undefined> = import.meta.env): ApiClient {
  const base = createMockApi()
  const config = readSupabaseConfig(env)
  if (!config) return withAuditTrail(base)
  return withAuditTrail(withSupabaseSettings(withSupabasePortal(withSupabaseWrites(base, config), config), config))
}
