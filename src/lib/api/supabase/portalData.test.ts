import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { HouseholdDraft } from '@/domain/household'
import { householdMethods, inboxMethods } from './portalData'

/**
 * A stand-in for PostgREST that records what was asked of it.
 *
 * The queries are the thing worth testing here — which schema, which table, which column — and
 * they are also the part that fails silently. A wrong column name returns no rows rather than
 * an error, and an empty screen looks the same as an empty account.
 */
function fakeClient(answers: Record<string, unknown> = {}, errors: Record<string, { code: string; message: string }> = {}) {
  const calls: string[] = []
  const chain = (table: string): Record<string, unknown> => {
    const self: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'in', 'insert', 'update', 'delete']) {
      self[method] = (...args: unknown[]) => {
        calls.push(`${table}.${method}(${args.map((a) => (typeof a === 'string' ? a : '…')).join(',')})`)
        return self
      }
    }
    const failure = errors[table] ?? null
    self.maybeSingle = async () => ({ data: failure ? null : (answers[table] ?? null), error: failure })
    self.single = async () => ({ data: failure ? null : (answers[table] ?? null), error: failure })
    self.then = (resolve: (v: unknown) => unknown) => resolve({ data: failure ? [] : (answers[table] ?? []), error: failure })
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


/**
 * The committee's inbox.
 *
 * Worth its own block because the visitor's half of this table and the committee's half are in
 * different files, under different keys, and were out of step: the website wrote real messages
 * to the database while this screen went on showing fixtures, so nothing a visitor sent ever
 * reached the people it was addressed to.
 */
describe('the inbox', () => {
  const row = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'cm-1',
    name: 'A Visitor',
    email: 'v@example.com',
    subject: 'Parking',
    message: 'Where do we park?',
    kind: 'general',
    handled_by: null,
    handled_note: null,
    created_at: '2026-09-01T10:00:00Z',
    ...over,
  })

  it('reads the portal schema, not public', async () => {
    const { client, calls } = fakeClient()
    await inboxMethods(async () => client).listMessages()
    expect(calls).toContain('schema(portal)')
    expect(calls.some((c) => c.startsWith('contact_messages.select'))).toBe(true)
  })

  it('puts takedowns nobody has dealt with at the top', async () => {
    const { client } = fakeClient({
      contact_messages: [
        row({ id: 'newest', created_at: '2026-09-09T10:00:00Z' }),
        row({ id: 'handled-takedown', kind: 'photo', handled_by: 'The Chatterjees', handled_note: 'Deleted it' }),
        row({ id: 'waiting-takedown', kind: 'photo', created_at: '2026-09-02T10:00:00Z' }),
      ],
    })
    const messages = await inboxMethods(async () => client).listMessages()
    // Older than the other two, and still first: a request to take a child's photograph down
    // is not something to read in the order it happened to arrive.
    expect(messages.map((m) => m.id)).toEqual(['waiting-takedown', 'newest', 'handled-takedown'])
  })

  it('leaves handledBy off entirely when nobody has, rather than setting it empty', async () => {
    const { client } = fakeClient({ contact_messages: [row()] })
    const [message] = await inboxMethods(async () => client).listMessages()
    // Every screen asks `message.handledBy ? …`, and the unread count is built from it.
    expect('handledBy' in message).toBe(false)
    expect('handledNote' in message).toBe(false)
  })

  it('records who dealt with it by name, because that is what the screen prints', async () => {
    const { client, calls } = fakeClient({
      households: { name: 'The Chatterjees' },
      contact_messages: row({ handled_by: 'The Chatterjees' }),
    })
    const updated = await inboxMethods(async () => client).markHandled('cm-1', { householdId: 'hh-chatterjee', role: 'admin' })

    expect(updated.handledBy).toBe('The Chatterjees')
    expect(calls).toContain('households.select(name)')
  })

  it('turns the takedown rule into a sentence a person can read', async () => {
    // The database refuses this with a check constraint, so the note cannot be skipped by
    // anything that talks to the table — including a request this app never made.
    const { client } = fakeClient({ households: { name: 'The Chatterjees' } }, {
      contact_messages: { code: '23514', message: 'new row violates check constraint "contact_messages_takedown_note_check"' },
    })
    await expect(
      inboxMethods(async () => client).markHandled('cm-1', { householdId: 'hh-chatterjee', role: 'admin' }),
    ).rejects.toThrow(/what happened to the photograph/)
  })

  it('refuses when the policy matched nothing, the same as when it is not there', async () => {
    const { client } = fakeClient({ households: { name: 'The Sens' } })
    await expect(
      inboxMethods(async () => client).markHandled('cm-1', { householdId: 'hh-sen', role: 'member' }),
    ).rejects.toThrow(/no such message/)
  })
})
