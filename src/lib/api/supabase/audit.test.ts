import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { actorName, auditMethods, toEntry } from './audit'

function fakeClient(rows: unknown[] = []) {
  const calls: string[] = []
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'order', 'limit']) {
    chain[method] = (...args: unknown[]) => {
      calls.push(`${method}(${args.map((a) => (typeof a === 'string' ? a : '…')).join(',')})`)
      return chain
    }
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null })
  const client = {
    schema: (name: string) => {
      calls.push(`schema(${name})`)
      return { from: (table: string) => (calls.push(`from(${table})`), chain) }
    },
  } as unknown as SupabaseClient
  return { client, calls }
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 'al-1',
  actor_household_id: 'hh-1',
  action: 'update',
  subject_kind: 'households',
  subject_id: 'hh-9',
  changes: { role: { from: 'member', to: 'admin' } },
  at: '2026-09-16T10:00:00.000Z',
  households: { name: 'The Chatterjees' },
  ...over,
})

describe('reading the trail the database keeps', () => {
  it('asks the portal schema, newest first, and stops at the limit', async () => {
    const { client, calls } = fakeClient()
    await auditMethods(async () => client).list({ householdId: 'h', role: 'admin' }, 25)
    expect(calls).toContain('schema(portal)')
    expect(calls).toContain('from(audit_log)')
    // By the sequence, not the timestamp: several rows changed by one statement share a
    // microsecond, and a stamp cannot separate those.
    expect(calls.some((c) => c.startsWith('order(seq'))).toBe(true)
    expect(calls).toContain('limit(…)')
  })

  it('gives nothing to somebody who is not on the committee, without asking', async () => {
    const { client, calls } = fakeClient([row()])
    expect(await auditMethods(async () => client).list({ householdId: 'h', role: 'member' })).toEqual([])
    expect(await auditMethods(async () => client).list(null)).toEqual([])
    // The policy would refuse them anyway; not asking saves a table that flickers into view.
    expect(calls).toEqual([])
  })

  it('keeps what a field was as well as what it became', async () => {
    const { client } = fakeClient([row()])
    const [entry] = await auditMethods(async () => client).list({ householdId: 'h', role: 'admin' })
    expect(entry.changes).toEqual({ role: { from: 'member', to: 'admin' } })
    expect(entry.subject).toEqual({ kind: 'households', id: 'hh-9' })
  })

  /*
   * The trigger sees a row change and nothing else, so it records `update` and the table. The
   * app's own wrapper records what somebody meant — `household:setRole`. Two vocabularies, and
   * this is the one that cannot be skipped, so the screen reads it rather than pretending.
   */
  it('reports what the database knows: the operation and the table', () => {
    expect(toEntry(row()).action).toBe('update households')
    expect(toEntry(row({ action: 'delete', subject_kind: 'contact_messages' })).action).toBe('delete contact_messages')
  })

  it('names who acted, and says so plainly when there is nobody left to name', () => {
    expect(actorName(row())).toBe('The Chatterjees')
    // `on delete set null`: erasing a household leaves its actions behind with nobody against
    // them, which is the intended answer — the account survives, the person does not.
    expect(actorName(row({ households: null }))).toBe('A household since erased')
    expect(actorName(row({ households: null, actor_household_id: null }))).toBe('The committee')
  })

  it('reads an entry with no changes recorded as no changes, not as a crash', () => {
    expect(toEntry(row({ changes: null })).changes).toEqual({})
  })
})
