import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { newsMethods } from './news'

/**
 * A stand-in for PostgREST that records what was asked of it.
 *
 * The queries are the thing worth testing: which table, which column, and — for public content —
 * what was *not* asked for, because the read policies are what keep a draft off the website and
 * a query that filters on its own is a query somebody can quietly stop filtering.
 */
function fakeClient(answers: Record<string, unknown> = {}, errors: Record<string, { code: string; message: string }> = {}) {
  const calls: string[] = []
  const chain = (table: string): Record<string, unknown> => {
    const self: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit']) {
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
  return {
    calls,
    client: { schema: () => ({ from: (table: string) => chain(table) }) } as unknown as SupabaseClient,
  }
}

const NOW = new Date('2026-09-16T10:00:00.000Z')

function api(answers: Record<string, unknown> = {}, errors: Record<string, { code: string; message: string }> = {}) {
  const { client, calls } = fakeClient(answers, errors)
  return { calls, news: newsMethods(async () => client, () => NOW) }
}

const postRow = (over: Record<string, unknown> = {}) => ({
  id: 'np-1',
  slug: 'a-first-piece',
  title: 'A first piece',
  excerpt: 'Something worth reading.',
  body: 'The body.',
  tags: ['durga-puja'],
  author: 'Someone',
  published_at: '2026-04-01T09:00:00.000Z',
  hidden: false,
  ...over,
})

const noticeRow = (over: Record<string, unknown> = {}) => ({
  id: 'an-1',
  title: 'Doors at six',
  body: 'The hall opens at six.',
  pinned: false,
  audience: 'public',
  publish_at: '2026-04-01T09:00:00.000Z',
  expires_at: null,
  link_label: null,
  link_to: null,
  ...over,
})

describe('reading what the committee has written', () => {
  it('leaves a draft off the website even if the policy handed one over', async () => {
    const { news } = api({ news_posts: [postRow({ published_at: null })] })
    expect(await news.listPosts()).toEqual([])
  })

  it('will not serve a draft by its address either', async () => {
    const { news } = api({ news_posts: postRow({ published_at: null }) })
    expect(await news.getPost('a-first-piece')).toBeNull()
  })

  it('leaves a piece that was taken down off the website, keeping its date', async () => {
    const { news } = api({ news_posts: [postRow({ hidden: true })] })
    expect(await news.listPosts()).toEqual([])
    const [all] = await news.listAllPosts({ householdId: 'h', role: 'admin' })
    // The date is what says which April the piece belongs to. Clearing it on the way down
    // would bring it back dated today, at the top of the list, as though it were new.
    expect(all.publishedAt).toBe('2026-04-01T09:00:00.000Z')
    expect(all.hidden).toBe(true)
  })

  it('asks for no dates on a notice, because the policy already applied them', async () => {
    const { news, calls } = api({ announcements: [noticeRow()] })
    await news.listAnnouncements()
    // Postgres's `now()`, not the browser's, and one place to get it wrong instead of two.
    expect(calls.some((c) => c.includes('publish_at') || c.includes('expires_at'))).toBe(false)
    expect(calls).toContain('announcements.eq(audience,public)')
  })

  it('reads a noticeboard pinned first, then newest', async () => {
    const { news } = api({
      announcements: [
        noticeRow({ id: 'old', publish_at: '2026-01-01T09:00:00.000Z' }),
        noticeRow({ id: 'newest', publish_at: '2026-09-01T09:00:00.000Z' }),
        noticeRow({ id: 'pinned', pinned: true, publish_at: '2026-02-01T09:00:00.000Z' }),
      ],
    })
    expect((await news.listAnnouncements()).map((a) => a.id)).toEqual(['pinned', 'newest', 'old'])
  })

  it('gives somebody who is not on the committee an empty list, not the published ones', async () => {
    const { news } = api({ news_posts: [postRow()] })
    expect(await news.listAllPosts({ householdId: 'h', role: 'member' })).toEqual([])
    expect(await news.listAllAnnouncements({ householdId: 'h', role: 'member' })).toEqual([])
  })
})

describe('writing', () => {
  it('says plainly when two pieces would share an address', async () => {
    const { news } = api({}, { news_posts: { code: '23505', message: 'duplicate key value violates unique constraint' } })
    await expect(
      news.createPost(
        { title: 'A first piece', excerpt: 'Something worth reading.', body: 'x'.repeat(60), tags: [], author: 'Someone', published: true },
        { householdId: 'h', role: 'admin' },
      ),
    ).rejects.toThrow(/already a piece with that title/)
  })

  it('stamps the date on the way up, and only the first time', async () => {
    const { news, calls } = api({ news_posts: postRow({ published_at: null, hidden: true }) })
    await news.updatePost(
      'np-1',
      { title: 'A first piece', excerpt: 'Something worth reading.', body: 'x'.repeat(60), tags: [], author: 'Someone', published: true },
      { householdId: 'h', role: 'admin' },
    )
    expect(calls.some((c) => c.startsWith('news_posts.update'))).toBe(true)
  })
})
