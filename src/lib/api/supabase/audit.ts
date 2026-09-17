import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuditEntry } from '@/domain/audit'
import { isAdmin, type Viewer } from '@/domain/household'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { dataClient } from '@/lib/auth/supabaseAuth'

type AuditRow = {
  id: string
  actor_household_id: string | null
  action: string
  subject_kind: string
  subject_id: string
  changes: Record<string, { from: unknown; to: unknown }> | null
  at: string
  /** From PostgREST's embedded select, following actor_household_id. */
  households?: { name: string } | null
}

/**
 * The database's trail speaks a different language from the app's, and this does not pretend
 * otherwise.
 *
 * `withAuditTrail` records what somebody meant — `messages:handle`, `household:setRole` — because
 * it sits where the intention is known. A trigger sees a row change and nothing else, so it
 * records `update` and the table it happened to. The database's version is the one that cannot
 * be skipped, so it is the one worth reading; the screen puts the two halves it does have —
 * what happened to what, and which fields moved — into a sentence.
 */
export function toEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    actorHouseholdId: row.actor_household_id ?? '',
    actor: actorName(row),
    action: `${row.action} ${row.subject_kind}`,
    subject: { kind: row.subject_kind, id: row.subject_id },
    changes: row.changes ?? {},
    at: row.at,
  }
}

/** Who acted, by name, for the rows where the household is still there to ask. */
export function actorName(row: AuditRow): string {
  // `on delete set null`, so erasing a household leaves its actions in the trail with nobody
  // against them. That is the intended answer: the account of what was done survives, the
  // person does not.
  return row.households?.name ?? (row.actor_household_id ? 'A household since erased' : 'The committee')
}

export function auditMethods(getClient: () => Promise<SupabaseClient>) {
  return {
    list: async (viewer: Viewer, limit = 50): Promise<AuditEntry[]> => {
      // The policy admits admins only, so a member gets an empty list from the database
      // whatever this does. Asked here as well so the screen does not flicker a table that
      // was never going to have anything in it.
      if (!isAdmin(viewer)) return []
      const client = await getClient()
      const { data } = await client
        .schema('portal')
        .from('audit_log')
        // One foreign key from here to households, so PostgREST needs no hint about which —
        // and naming the generated constraint would be depending on a name nothing guarantees.
        .select('*,households(name)')
        /*
         * By `seq`, not by `at`. A statement that changes several rows fires the trigger for
         * each of them inside one microsecond, and a timestamp cannot separate those — so
         * ordering on it leaves a write and the write that undid it in an arbitrary order.
         */
        .order('seq', { ascending: false })
        .limit(limit)
      return ((data ?? []) as AuditRow[]).map(toEntry)
    },
  }
}

/**
 * Read from the database rather than from memory.
 *
 * Applied outside `withAuditTrail`, which keeps its own list and would otherwise answer this
 * from it — a list built in the browser, thrown away on reload, and missing everything done
 * from any other tab or by anybody else. The trail worth reading is the one the triggers write.
 */
export function withSupabaseAudit(base: ApiClient, config: SupabaseConfig): ApiClient {
  return { ...base, audit: auditMethods(() => dataClient(config)) }
}
