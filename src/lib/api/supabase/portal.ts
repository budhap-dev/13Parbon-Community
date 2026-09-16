import { dataClient } from '@/lib/auth/supabaseAuth'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { householdMethods, inboxMethods } from './portalData'

/**
 * Swaps the back office over to the real database, leaving everything else on fixtures.
 *
 * The whole `portal` section at once, not half of it. A screen where the households are real
 * and the directory is sample data is a screen nobody can reason about — and the first thing
 * anybody would do with it is doubt the half that was right.
 *
 * The committee's inbox comes with it, for the same reason. `withSupabaseWrites` already posts
 * a visitor's message to the real table under the anon key; left on fixtures, the screen the
 * committee reads would show sample messages and never the ones actually arriving.
 *
 * Events, news and the gallery stay on fixtures for now, which is honest: they have no tables
 * yet. That line moves as each one gets them.
 */
export function withSupabasePortal(base: ApiClient, config: SupabaseConfig): ApiClient {
  const client = () => dataClient(config)
  const methods = householdMethods(client)
  const inbox = inboxMethods(client)
  return {
    ...base,
    contact: {
      // `send` is left alone: it belongs to the public website, which has no session and posts
      // under the anon key. Only the reading half moves here.
      ...base.contact,
      listMessages: () => inbox.listMessages(),
      markHandled: (id, viewer, note) => inbox.markHandled(id, viewer, note),
    },
    portal: {
      ...base.portal,
      identify: methods.identify,
      getHousehold: (id) => methods.getHousehold(id),
      listHouseholds: () => methods.listHouseholds(),
      listDirectory: () => methods.listDirectory(),
      listDocuments: () => methods.listDocuments(),
      listSignInAttempts: () => methods.listSignInAttempts(),
      listAttendance: () => methods.listAttendance(),
      addHousehold: (draft, viewer) => methods.addHousehold(draft, viewer),
      updateHousehold: (id, draft, viewer) => methods.updateHousehold(id, draft, viewer),
      deleteHousehold: (id) => methods.deleteHousehold(id),
      resolveSignInAttempt: (id) => methods.resolveSignInAttempt(id),
      recordAttendance: (draft) => methods.recordAttendance(draft),
      exportHousehold: (id) => methods.exportHousehold(id),
    },
  }
}
