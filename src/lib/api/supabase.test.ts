import { createMockApi } from './mock'
import { readSupabaseConfig, withSupabaseWrites, type PostJson } from './supabase'

const config = { url: 'https://project.supabase.co', anonKey: 'anon-key' }
const contact = { name: 'Rina Sen', email: 'rina@example.com', subject: 'Parking', message: 'Where do we park on the night?' }

function respondWith(rows: unknown[], ok = true) {
  return vi.fn<PostJson>(async () => ({ ok, json: async () => rows }))
}

/** The url and parsed body of one recorded call. */
function callAt(doFetch: ReturnType<typeof respondWith>, index = 0) {
  const call = doFetch.mock.calls[index]
  if (!call) throw new Error('fetch was not called')
  const [url, options] = call
  return { url, headers: options.headers, body: JSON.parse(options.body) as Record<string, unknown> }
}

describe('readSupabaseConfig', () => {
  it('needs both values and trims a trailing slash', () => {
    expect(readSupabaseConfig({})).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_ANON_KEY: 'k' })).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({
      url: 'https://x.supabase.co',
      anonKey: 'k',
    })
  })
})

describe('withSupabaseWrites', () => {
  it('reports that submissions are delivered and keeps the base reads', async () => {
    const api = withSupabaseWrites(createMockApi(), config, respondWith([]))
    expect(api.delivers).toBe(true)
    expect(createMockApi().delivers).toBe(false)
    expect(await api.festivals.list()).toHaveLength(4)
  })

  it('posts a contact message to PostgREST and gives back a receipt', async () => {
    const doFetch = respondWith([])
    const sent = await withSupabaseWrites(createMockApi(), config, doFetch).contact.send(contact)

    // What the thank-you screen shows, and nothing more: the row itself is not readable by the
    // public website, so there is nothing else honest to hand back.
    expect(sent).toEqual({ name: contact.name, email: contact.email })

    const call = callAt(doFetch)
    expect(call.url).toBe('https://project.supabase.co/rest/v1/contact_messages')
    expect(call.headers.apikey).toBe('anon-key')
    expect(call.body).toEqual({ ...contact, kind: 'general' })
  })

  /*
   * The bug this catches broke the contact form completely against the real database, and no
   * test or screen showed it: `return=representation` makes PostgREST write INSERT ... RETURNING,
   * RETURNING is a read, and a visitor has no select policy on this table by design. Every
   * submission failed. `supabase/verify.sql` is what finally said so.
   */
  it('does not ask for the row back, because a visitor may not read this table', async () => {
    const doFetch = respondWith([])
    await withSupabaseWrites(createMockApi(), config, doFetch).contact.send(contact)
    expect(callAt(doFetch).headers.Prefer).toBe('return=minimal')
  })

  /*
   * The flag used to be dropped on the way out: the form set it, the insert did not send it,
   * and a request to take down a photograph of somebody's child arrived in the committee's
   * inbox indistinguishable from a question about parking. Nothing on any screen showed it —
   * the takedown notice looked sent, and the promise behind it was three days.
   */
  it('carries the takedown flag through to the row, rather than dropping it', async () => {
    const takedown = { ...contact, kind: 'photo' as const, subject: 'Please take down a photograph' }
    const doFetch = respondWith([])

    await withSupabaseWrites(createMockApi(), config, doFetch).contact.send(takedown)

    expect(callAt(doFetch).body.kind).toBe('photo')
  })

  it('validates before posting and explains failures in plain words', async () => {
    const doFetch = respondWith([])
    const api = withSupabaseWrites(createMockApi(), config, doFetch)
    await expect(api.contact.send({ ...contact, email: 'nope' })).rejects.toThrow(/check the form/)
    await expect(api.contact.send({ ...contact, message: 'short' })).rejects.toThrow(/check the form/)
    expect(doFetch).not.toHaveBeenCalled()

    const rejected = withSupabaseWrites(createMockApi(), config, respondWith([], false))
    await expect(rejected.contact.send(contact)).rejects.toThrow(/could not send that just now/)

    const offline = withSupabaseWrites(createMockApi(), config, vi.fn<PostJson>(async () => {
      throw new Error('network')
    }))
    await expect(offline.contact.send(contact)).rejects.toThrow(/could not reach the server/)
  })
})

describe('which schema it writes to', () => {
  it('names the portal schema on every request', async () => {
    // The project is shared with the committee's event planner, which owns a `people` table of
    // its own. Without this header PostgREST looks in `public` and finds theirs.
    const calls: { headers: Record<string, string> }[] = []
    const doFetch = async (_url: string, options: { method: string; headers: Record<string, string>; body: string }) => {
      calls.push(options)
      return { ok: true, json: async () => [{ id: '1', name: 'A', email: 'a@b.co', subject: 's', message: 'm', created_at: '2026-01-01' }] }
    }
    const api = withSupabaseWrites(createMockApi(), { url: 'https://x.supabase.co', anonKey: 'k' }, doFetch)
    await api.contact.send({ name: 'A Visitor', email: 'a@b.co', subject: 'Hello', message: 'Long enough to pass.' })

    expect(calls[0].headers['Content-Profile']).toBe('portal')
    expect(calls[0].headers['Accept-Profile']).toBe('portal')
  })
})
