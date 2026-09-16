import { mergeSettings, validateSettings, type SiteSettings } from '@/domain/settings'
import { isAdmin, type Viewer } from '@/domain/household'
import { NotAllowed } from '../mock'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { dataClient } from '@/lib/auth/supabaseAuth'

/**
 * The switches the committee owns, against the real database.
 *
 * Read by everybody, including a visitor with no session: the public site asks this table
 * whether the gallery and the news pages exist at all, so it goes out under the anon key and
 * the policy says `using (true)`. Nothing in here is private — the switches, the words already
 * printed on the pages, and the same names the About page has always carried.
 *
 * Written by the committee only, which the database enforces and this does not re-check.
 */
export function withSupabaseSettings(base: ApiClient, config: SupabaseConfig): ApiClient {
  const table = async () => (await dataClient(config)).schema('portal').from('site_settings')

  /*
   * `defaults` comes from the base client rather than from `@/app/defaults`, so whatever the
   * code says is the fallback stays the fallback in one place. A project with nothing saved
   * behaves exactly as a project with no database does.
   */
  const load = async (): Promise<SiteSettings> => {
    const defaults = await base.settings.get()
    const { data } = await (await table()).select('value').eq('id', true).maybeSingle()
    // No row is the ordinary state of a new project, not a failure: nobody has changed anything
    // yet, so the code's own values are the right answer.
    return mergeSettings((data as { value: unknown } | null)?.value, defaults)
  }

  return {
    ...base,
    settings: {
      get: load,
      save: async (draft, viewer: Viewer) => {
        if (!validateSettings(draft)) throw new NotAllowed('those settings do not look right')
        const { error } = await (await table()).upsert(
          { id: true, value: draft, updated_at: new Date().toISOString() },
          { onConflict: 'id' },
        )
        /*
         * A refused write comes back 42501 here rather than as no rows, because this is an
         * upsert with a `with check` on both policies. Translated rather than shown raw — and
         * `isAdmin` is only consulted for the wording, never to decide.
         */
        if (error) {
          throw error.code === '42501' || !isAdmin(viewer)
            ? new NotAllowed('only the committee can change that')
            : new Error(error.message)
        }
        return load()
      },
    },
  }
}
