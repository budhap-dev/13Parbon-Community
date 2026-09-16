import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { HouseholdDraft } from '@/domain/household'
import { householdMethods } from './portalData'

/**
 * A stand-in for PostgREST that records what was asked of it.
 *
 * The queries are the thing worth testing here — which schema, which table, which column — and
 * they are also the part that fails silently. A wrong column name returns no rows rather than
 * an error, and an empty screen looks the same as an empty account.
 */
function fakeClient(answers: Record<string, unknown> = {}) {
  const calls: string[] = []
  const chain = (table: string): Record<string, unknown> => {
    const self: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'in', 'insert', 'update', 'delete']) {
      self[method] = (...args: unknown[]) => {
        calls.push(`${table}.${method}(${args.map((a) => (typeof a === 'string' ? a : '…')).join(',')})`)
        return self
      }
    }
    self.maybeSingle = async () => ({ data: answers[table] ?? null, error: null })
    self.single = async () => ({ data: answers[table] ?? null, error: null })
    self.then = (resolve: (v: unknown) => unknown) => resolve({ data: answers[table] ?? [], error: null })
    return self
  }
  const client = {
    schema: (name: string) => {
      calls.push(`schema(${name})`)
      return { from: (table: string) => chain(table) }
    },
  } as unknown as SupabaseClient
  return { client, calls }
}

const draft: HouseholdDraft = {
  name: 'The Sens',
  contactName: 'Rina Sen',
  email: 'rina@example.com',
  people: [{ name: 'Rina Sen', ageGroup: 'adult' }],
  interests: [],
  listedInDirectory: false,
  shareEmail: false,
  sharePhone: false,
}

describe('which database it talks to', () => {
  it('asks the portal schema, never public', async () => {
    const { client, calls } = fakeClient()
    await householdMethods(async () => client).listHouseholds()
    // public belongs to the committee's event planner, which has a people table of its own.
    expect(calls).toContain('schema(portal)')
    expect(calls.some((c) => c.includes('schema(public)'))).toBe(false)
  })
})

describe('identifying somebody at sign-in', () => {
  it('matches the address lowercased and trimmed', async () => {
    const { client, calls } = fakeClient()
    await householdMethods(async () => client).identify('  Rina.Sen@GMAIL.com ')
    // Google returns whatever case the account was made in; the column stores it lowercased.
    expect(calls).toContain('households.eq(google_email,rina.sen@gmail.com)')
  })

  it('returns nothing for an address with no household', async () => {
    const { client } = fakeClient()
    expect(await householdMethods(async () => client).identify('stranger@example.com')).toBeNull()
  })
})

describe('reading a household', () => {
  it('asks for the people alongside it, in one request', async () => {
    const { client, calls } = fakeClient()
    await householdMethods(async () => client).getHousehold('hh-1')
    expect(calls).toContain('households.select(*,people(*))')
  })

  it('answers "not there" for one the policies hide', async () => {
    // A household somebody may not see comes back as no rows, exactly as a missing one does.
    // Telling those two apart would itself be a leak.
    const { client } = fakeClient()
    expect(await householdMethods(async () => client).getHousehold('hh-someone-else')).toBeNull()
  })
})

describe('saving the people of a household', () => {
  it('puts the new ones in before taking the old ones out', async () => {
    // With people already there: nothing is deleted otherwise, and the order cannot be seen.
    const { client, calls } = fakeClient({ households: { id: 'hh-1' }, people: [{ id: 'p-old' }] })
    await householdMethods(async () => client).updateHousehold('hh-1', draft, { householdId: 'hh-1', role: 'member' })

    const insert = calls.findIndex((c) => c.startsWith('people.insert'))
    const remove = calls.findIndex((c) => c.startsWith('people.delete'))
    // There is no transaction across two PostgREST calls. Delete-then-fail loses a family's
    // details; insert-then-fail lists everybody twice, which somebody can fix in a minute.
    expect(insert).toBeGreaterThan(-1)
    expect(remove).toBeGreaterThan(insert)
  })

  it('refuses a household with nobody grown up in it before asking the database', async () => {
    const { client, calls } = fakeClient()
    const children: HouseholdDraft = { ...draft, people: [{ name: 'Mira', ageGroup: 'child', age: 7 }] }
    await expect(
      householdMethods(async () => client).addHousehold(children, { householdId: 'x', role: 'admin' }),
    ).rejects.toThrow(/not complete/i)
    expect(calls).toEqual([])
  })
})
