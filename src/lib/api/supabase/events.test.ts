import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { eventMethods, fromDraft, toEvent } from './events'
import { blankEvent } from '@/domain/event'

function fakeClient(rows: unknown[] = [], errors: { code: string; message: string } | null = null) {
  const calls: string[] = []
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'insert', 'update']) {
    chain[method] = (...args: unknown[]) => {
      calls.push(`${method}(${args.map((a) => (typeof a === 'string' ? a : '…')).join(',')})`)
      return chain
    }
  }
  const first = () => (errors ? null : (rows[0] ?? null))
  chain.maybeSingle = async () => ({ data: first(), error: errors })
  chain.single = async () => ({ data: first(), error: errors })
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: errors ? [] : rows, error: errors })
  return { calls, client: { schema: () => ({ from: () => chain }) } as unknown as SupabaseClient }
}

const NOW = new Date('2026-06-01T12:00:00.000Z')
const admin = { householdId: 'hh-chatterjee', role: 'admin' } as const
const at = (iso: string) => ({ starts_at: iso })

const row = (over: Record<string, unknown> = {}): Parameters<typeof toEvent>[0] => ({
  id: 'ev-1', slug: 'a-night', title: 'A night', summary: 'An evening.',
  starts_at: '2026-09-20T18:00:00.000Z', ends_at: null, venue: 'The hall', venue_address: null,
  latitude: null, longitude: null, festival_id: null, is_public: true, status: 'published',
  registration_open: false, registration_url: null, performer_form_url: null,
  households_registered: 0, cover_image_url: null, cover_animation: null, theme: null,
  programme: null, volunteer_call: null, performer_call: null, ...over,
}) as Parameters<typeof toEvent>[0]

describe('which list an evening falls into', () => {
  const events = (rows: unknown[]) => eventMethods(async () => fakeClient(rows).client, () => NOW)

  it('keeps a cancelled evening in the upcoming list, marked, until its date has passed', async () => {
    // Quietly dropping one is indistinguishable from never having announced it, and that is
    // how somebody ends up outside a hall on a Saturday.
    const upcoming = await events([row({ id: 'off', status: 'cancelled', ...at('2026-09-20T18:00:00.000Z') })]).listUpcoming()
    expect(upcoming.map((e) => e.id)).toEqual(['off'])
  })

  it('does not count a cancelled evening as the next one', async () => {
    // A countdown to an evening that is not happening is cruel.
    const list = [
      row({ id: 'off', status: 'cancelled', ...at('2026-06-10T18:00:00.000Z') }),
      row({ id: 'on', status: 'published', ...at('2026-07-10T18:00:00.000Z') }),
    ]
    expect((await events(list).getNext())?.id).toBe('on')
  })

  it('leaves a draft out of every public list, and off its own page', async () => {
    const draft = [row({ id: 'unfinished', status: 'draft' })]
    expect(await events(draft).listUpcoming()).toEqual([])
    expect(await events(draft).getNext()).toBeNull()
    expect(await events(draft).getBySlug('a-night')).toBeNull()
  })

  it('still answers for a cancelled evening by its address, because somebody holds the link', async () => {
    expect((await events([row({ status: 'cancelled' })]).getBySlug('a-night'))?.status).toBe('cancelled')
  })

  it('gives somebody who is not on the committee an empty list of everything', async () => {
    expect(await events([row()]).listAll({ householdId: 'h', role: 'member' })).toEqual([])
  })
})

describe('writing one', () => {
  it('arrives as a draft whatever the form said', async () => {
    const { client, calls } = fakeClient([row()])
    await eventMethods(async () => client, () => NOW).create(
      { ...blankEvent(), title: 'A night', summary: 'An evening.', startsAt: '2026-09-20T18:00', venue: 'The hall', status: 'published' },
      admin,
    )
    // A new evening is nobody's business until it is finished.
    expect(calls.some((c) => c.startsWith('insert'))).toBe(true)
  })

  it('refuses one that is not ready before asking the database', async () => {
    const { client, calls } = fakeClient()
    await expect(
      eventMethods(async () => client, () => NOW).create({ ...blankEvent(), title: '' }, admin),
    ).rejects.toThrow(/not ready/)
    expect(calls).toEqual([])
  })

  it('says plainly when two evenings would take the same address', async () => {
    const { client } = fakeClient([], { code: '23505', message: 'duplicate key' })
    await expect(
      eventMethods(async () => client, () => NOW).create(
        { ...blankEvent(), title: 'A night', summary: 'An evening.', startsAt: '2026-09-20T18:00', venue: 'The hall' },
        admin,
      ),
    ).rejects.toThrow(/already an evening with that name/)
  })
})

describe("between the database's words and the app's", () => {
  it('leaves an empty theme absent rather than drawing a blank kicker', () => {
    expect(toEvent(row({ theme: { bengali: '' } })).theme).toBeUndefined()
    expect(toEvent(row({ theme: { bengali: 'শরৎ' } })).theme).toEqual({ bengali: 'শরৎ' })
    expect(fromDraft({ ...blankEvent(), theme: { bengali: ' ', bengaliSubtitle: 'x', english: 'y' } }).theme).toBeNull()
  })

  it('carries coordinates only when both halves are there', () => {
    expect(toEvent(row({ latitude: 51.5, longitude: -0.1 })).coordinates).toEqual({ lat: 51.5, lon: -0.1 })
    // Half a pair would put the map in the sea.
    expect(toEvent(row({ latitude: 51.5, longitude: null })).coordinates).toBeUndefined()
  })

  it('drops the blank rows of a programme and puts the rest in time order', () => {
    const programme = fromDraft({
      ...blankEvent(),
      programme: [{ time: '19:00', what: 'Dinner' }, { time: '18:00', what: 'Doors' }, { time: '', what: '  ' }],
    }).programme
    expect(programme).toEqual([{ time: '18:00', what: 'Doors' }, { time: '19:00', what: 'Dinner' }])
  })
})
