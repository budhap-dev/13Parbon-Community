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
  /**
   * The address the actor signed in with. Absent before portal.sql was re-run with it, and on
   * every line written before then; null for the committee's own work and for an erased household.
   */
  actor_email?: string | null
  /** From PostgREST's embedded select, following actor_household_id, with its people. */
  households?: {
    name: string
    contact_name?: string
    google_email?: string | null
    people?: { name: string; google_email?: string | null }[] | null
  } | null
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
    ...(row.actor_email ? { actorAddress: row.actor_email } : {}),
    action: `${row.action} ${row.subject_kind}`,
    subject: { kind: row.subject_kind, id: row.subject_id },
    changes: row.changes ?? {},
    at: row.at,
  }
}

/**
 * Who acted, by name, for the rows where the household is still there to ask.
 *
 * The person, where the address they signed in with says which: a grown-up's own address is
 * theirs by name, and the household's own is its main contact's — the person the committee
 * recorded it for. An address on neither any more (somebody unlinked since) is shown as the
 * address. Lines from before addresses were recorded say the household, as they always did.
 */
export function actorName(row: AuditRow): string {
  const household = row.households
  // `on delete set null`, so erasing a household leaves its actions in the trail with nobody
  // against them. That is the intended answer: the account of what was done survives, the
  // person does not.
  if (!household) return row.actor_household_id ? 'A household since erased' : 'The committee'
  const address = row.actor_email?.toLowerCase()
  if (!address) return household.name
  const person = household.people?.find((p) => p.google_email?.toLowerCase() === address)
  if (person) return `${person.name}, ${household.name}`
  if (household.google_email?.toLowerCase() === address && household.contact_name) {
    return `${household.contact_name}, ${household.name}`
  }
  return `${address}, ${household.name}`
}

export function auditMethods(getClient: () => Promise<SupabaseClient>) {
  return {
    list: async (viewer: Viewer, limit = 50): Promise<AuditEntry[]> => {
      // The policy admits admins only, so a member gets an empty list from the database
      // whatever this does. Asked here as well so the screen does not flicker a table that
      // was never going to have anything in it.
      if (!isAdmin(viewer)) return []
      const client = await getClient()
      const { data, error } = await client
        .schema('portal')
        .from('audit_log')
        // One foreign key from here to households, so PostgREST needs no hint about which —
        // and naming the generated constraint would be depending on a name nothing guarantees.
        // `people(*)` rather than naming its columns, so a database portal.sql has not reached
        // yet still answers: the names come back, the addresses are simply not there.
        .select('*,households(name,contact_name,google_email,people(*))')
        /*
         * By `seq`, not by `at`. A statement that changes several rows fires the trigger for
         * each of them inside one microsecond, and a timestamp cannot separate those — so
         * ordering on it leaves a write and the write that undid it in an arbitrary order.
         */
        .order('seq', { ascending: false })
        .limit(limit)
      if (error) throw new Error(`The history could not be read: ${error.message}`)
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
