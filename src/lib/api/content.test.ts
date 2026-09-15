import { describe, expect, it } from 'vitest'
import type { Viewer } from '@/domain/household'
import { ANNOUNCEMENT_MAX, type AnnouncementDraft, type NewsDraft } from '@/domain/news'
import { withAuditTrail } from './audit'
import { createMockApi } from './mock'

const member: Viewer = { householdId: 'hh-sen', role: 'member' }
const admin: Viewer = { householdId: 'hh-chatterjee', role: 'admin' }
const api = () => withAuditTrail(createMockApi())

const piece: NewsDraft = {
  title: 'How the Boishakhi evening went',
  excerpt: 'Two hundred of us, and the hall only just held everybody.',
  body: 'The hall was full by seven.\n\nThe children went first, as they always do, and nobody minded that it ran long.',
  tags: ['boishakhi'],
  author: 'Debashis Chatterjee',
  published: true,
}

const notice: AnnouncementDraft = {
  title: 'Doors open at six',
  body: 'The hall is open from six on Saturday, and the programme starts at half past seven.',
  pinned: false,
  audience: 'public',
  publishAt: '',
  expiresAt: '',
}

describe('who may write here', () => {
  it('is the committee, and nobody else', async () => {
    const a = api()
    expect(await a.news.listAllPosts(member)).toEqual([])
    expect(await a.news.listAllAnnouncements(member)).toEqual([])
    await expect(a.news.createPost(piece, member)).rejects.toThrow(/committee/i)
    await expect(a.news.createAnnouncement(notice, member)).rejects.toThrow(/committee/i)
  })
})

describe('a news post', () => {
  it('gets an address from its title', async () => {
    const post = await api().news.createPost(piece, admin)
    expect(post.slug).toBe('how-the-boishakhi-evening-went')
  })

  it('refuses a second piece that would take the same address', async () => {
    const a = api()
    await a.news.createPost(piece, admin)
    await expect(a.news.createPost(piece, admin)).rejects.toThrow(/already a piece/i)
  })

  it('can be written without being published', async () => {
    const a = api()
    const post = await a.news.createPost({ ...piece, published: false }, admin)

    expect(post.publishedAt).toBeUndefined()
    // A draft is the committee's business and nobody else's.
    expect((await a.news.listPosts(100)).some((p) => p.id === post.id)).toBe(false)
    expect(await a.news.getPost(post.slug)).toBeNull()
    expect((await a.news.listAllPosts(admin)).some((p) => p.id === post.id)).toBe(true)
  })

  it('goes onto the website when it is published', async () => {
    const a = api()
    const draft = await a.news.createPost({ ...piece, published: false }, admin)
    await a.news.updatePost(draft.id, { ...piece, published: true }, admin)

    expect((await a.news.listPosts(100)).some((p) => p.id === draft.id)).toBe(true)
  })

  it('is unpublished rather than deleted, and the writing stays', async () => {
    const a = api()
    const post = await a.news.createPost(piece, admin)
    await a.news.updatePost(post.id, { ...piece, published: false }, admin)

    expect((await a.news.listPosts(100)).some((p) => p.id === post.id)).toBe(false)
    const kept = (await a.news.listAllPosts(admin)).find((p) => p.id === post.id)
    expect(kept?.body).toContain('The hall was full by seven')
  })

  it('keeps the writing and the date when it is taken down', async () => {
    const a = api()
    const post = await a.news.createPost(piece, admin)
    const down = await a.news.updatePost(post.id, { ...piece, published: false }, admin)
    // Clearing the date would lose the only record of when the piece belongs to.
    expect(down.publishedAt).toBe(post.publishedAt)
    expect(down.hidden).toBe(true)
  })

  it('keeps the date it first went up when it goes back up', async () => {
    const a = api()
    const post = await a.news.createPost(piece, admin)
    const first = post.publishedAt

    await a.news.updatePost(post.id, { ...piece, published: false }, admin)
    const again = await a.news.updatePost(post.id, { ...piece, published: true }, admin)
    // Otherwise a piece from April reappears at the top of the list as though it were new.
    expect(again.publishedAt).toBe(first)
  })

  it('records taking something down as its own kind of change', async () => {
    const a = api()
    const post = await a.news.createPost(piece, admin)
    await a.news.updatePost(post.id, { ...piece, published: false }, admin)

    // "Who took that down?" is the question this exists to answer.
    expect((await a.audit.list(admin))[0].action).toBe('news:unpublish')
  })

  it('refuses a piece with nothing in it', async () => {
    await expect(api().news.createPost({ ...piece, body: 'Short.' }, admin)).rejects.toThrow(/not finished/i)
  })
})

describe('an announcement', () => {
  it('goes up straight away when no date is given', async () => {
    const a = api()
    const made = await a.news.createAnnouncement(notice, admin)
    expect(made.publishAt).toBeTruthy()
    expect((await a.news.listAnnouncements()).some((x) => x.id === made.id)).toBe(true)
  })

  it('stays off the public page when it is for members', async () => {
    const a = api()
    const made = await a.news.createAnnouncement({ ...notice, audience: 'members' }, admin)
    expect((await a.news.listAnnouncements()).some((x) => x.id === made.id)).toBe(false)
    expect((await a.news.listAllAnnouncements(admin)).some((x) => x.id === made.id)).toBe(true)
  })

  it('refuses an essay, because a noticeboard is not a feed', async () => {
    // The story is firm: this never competes with WhatsApp for attention.
    const long = { ...notice, body: 'x'.repeat(ANNOUNCEMENT_MAX + 1) }
    await expect(api().news.createAnnouncement(long, admin)).rejects.toThrow(/not ready/i)
  })

  it('refuses one that stops before it starts', async () => {
    const wrong = { ...notice, publishAt: '2026-10-01T00:00:00', expiresAt: '2026-09-01T00:00:00' }
    await expect(api().news.createAnnouncement(wrong, admin)).rejects.toThrow(/not ready/i)
  })

  it('can be pinned, and unpinned again', async () => {
    const a = api()
    const made = await a.news.createAnnouncement({ ...notice, pinned: true }, admin)
    expect(made.pinned).toBe(true)
    expect((await a.news.updateAnnouncement(made.id, { ...notice, pinned: false }, admin)).pinned).toBe(false)
  })

  it('clears an expiry that is taken off', async () => {
    const a = api()
    const made = await a.news.createAnnouncement({ ...notice, expiresAt: '2027-01-01T00:00:00' }, admin)
    expect(made.expiresAt).toBeTruthy()

    const after = await a.news.updateAnnouncement(made.id, { ...notice, expiresAt: '' }, admin)
    // Left behind, it would take the notice down on a date nobody remembers setting.
    expect(after.expiresAt).toBeUndefined()
  })

  it('is really gone when it is taken off the board', async () => {
    const a = api()
    const made = await a.news.createAnnouncement(notice, admin)
    await a.news.removeAnnouncement(made.id, admin)

    expect((await a.news.listAllAnnouncements(admin)).some((x) => x.id === made.id)).toBe(false)
    // A note that has stopped being true has no version worth keeping — unlike a piece of
    // writing, which is unpublished instead.
    expect((await a.audit.list(admin))[0].action).toBe('announcement:remove')
  })
})
