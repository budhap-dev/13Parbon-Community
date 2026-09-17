import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PIECE_MIN } from '@/domain/news'
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
    for (const method of ['select', 'eq', 'in', 'lte', 'or', 'order', 'insert', 'update', 'delete', 'limit']) {
      self[method] = (...args: unknown[]) => {
        // Arrays are written out rather than elided, so a test can assert which audiences were asked for.
        const shown = (a: unknown) => (typeof a === 'string' ? a : Array.isArray(a) ? a.join('|') : '…')
        calls.push(`${table}.${method}(${args.map(shown).join(',')})`)
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
  excerpt: 'Something worth reading, and worth opening.',
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

  /*
   * This used to assert the opposite — that no dates were sent, because the policy applies
   * them. The policy does, for everybody except an admin: `admins read every notice` admits
   * drafts and expired ones, so an admin on the public page saw notices nobody else could.
   * The dates are sent as the literal `now`, which Postgres resolves, so the clock is still
   * its own rather than the browser's.
   */
  it('asks for live notices only, so an admin does not see drafts on the public page', async () => {
    const { news, calls } = api({ announcements: [noticeRow()] })
    await news.listAnnouncements(null)
    expect(calls.some((c) => c.includes('publish_at') && c.includes('now'))).toBe(true)
    expect(calls.some((c) => c.includes('expires_at') && c.includes('now'))).toBe(true)
  })

  it('asks for members-only notices too once somebody is signed in', async () => {
    const visitor = api({ announcements: [noticeRow()] })
    await visitor.news.listAnnouncements(null)
    expect(visitor.calls.some((c) => c.includes('audience') && c.includes('members'))).toBe(false)

    // The policies decide what comes back; asking is what was missing. Before this, a notice
    // written for members was unreachable by them however the policies were written.
    const member = api({ announcements: [noticeRow()] })
    await member.news.listAnnouncements({ householdId: 'hh-sen', role: 'member' })
    expect(member.calls.some((c) => c.includes('audience') && c.includes('members'))).toBe(true)
  })

  it('reads a noticeboard pinned first, then newest', async () => {
    const { news } = api({
      announcements: [
        noticeRow({ id: 'old', publish_at: '2026-01-01T09:00:00.000Z' }),
        noticeRow({ id: 'newest', publish_at: '2026-09-01T09:00:00.000Z' }),
        noticeRow({ id: 'pinned', pinned: true, publish_at: '2026-02-01T09:00:00.000Z' }),
      ],
    })
    expect((await news.listAnnouncements(null)).map((a) => a.id)).toEqual(['pinned', 'newest', 'old'])
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
        { title: 'A first piece', excerpt: 'Something worth reading, and worth opening.', body: 'x'.repeat(PIECE_MIN), tags: [], author: 'Someone', published: true },
        { householdId: 'h', role: 'admin' },
      ),
    ).rejects.toThrow(/already a piece with that title/)
  })

  /*
   * Destroying a piece, which is not how one is normally taken down: `hidden` is, and it keeps
   * the writing and the date. This is for a piece that should never have been there — the three
   * that arrived with the fixtures being the case that asked for it.
   */
  it('deletes a piece and says which one it was', async () => {
    const { news, calls } = api({ news_posts: { id: 'np-1' } })
    await news.removePost('np-1', { householdId: 'h', role: 'admin' })
    expect(calls).toContain('news_posts.delete()')
    expect(calls).toContain('news_posts.eq(id,np-1)')
  })

  it('does not pretend to have deleted a piece the policy hid', async () => {
    // No row came back: either it is not there, or this person may not touch it. The screen is
    // told the same thing either way, which is the answer the policy intends.
    const { news } = api()
    await expect(news.removePost('np-9', { householdId: 'h', role: 'admin' })).rejects.toThrow(/no such piece/)
  })

  it('stamps the date on the way up, and only the first time', async () => {
    const { news, calls } = api({ news_posts: postRow({ published_at: null, hidden: true }) })
    await news.updatePost(
      'np-1',
      { title: 'A first piece', excerpt: 'Something worth reading, and worth opening.', body: 'x'.repeat(PIECE_MIN), tags: [], author: 'Someone', published: true },
      { householdId: 'h', role: 'admin' },
    )
    expect(calls.some((c) => c.startsWith('news_posts.update'))).toBe(true)
  })
})
