import { createMockApi } from './mock'
import { readSupabaseConfig, withSupabaseWrites } from './supabase'
import type { ApiClient } from './types'

/**
 * The client the app runs on. Content comes from fixtures until the admin portal
 * exists; submissions go to Supabase as soon as the two environment variables are set,
 * and until then `delivers` is false so the forms offer email instead.
 */
export function createApi(env: Record<string, string | undefined> = import.meta.env): ApiClient {
  const base = createMockApi()
  const config = readSupabaseConfig(env)
  return config ? withSupabaseWrites(base, config) : base
}
