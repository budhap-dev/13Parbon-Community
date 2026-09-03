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

  it('posts a contact message to PostgREST and maps the row back', async () => {
    const doFetch = respondWith([
      { id: 'row-1', name: 'Rina Sen', email: 'rina@example.com', subject: 'Parking', message: 'Where do we park on the night?', created_at: '2026-09-03T10:00:00Z' },
    ])
    const sent = await withSupabaseWrites(createMockApi(), config, doFetch).contact.send(contact)
    expect(sent).toEqual({ id: 'row-1', ...contact, createdAt: '2026-09-03T10:00:00Z' })
    const call = callAt(doFetch)
    expect(call.url).toBe('https://project.supabase.co/rest/v1/contact_messages')
    expect(call.headers.apikey).toBe('anon-key')
    expect(call.body).toEqual(contact)
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
