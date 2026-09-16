import { describe, expect, it } from 'vitest'
import type { Viewer } from '@/domain/household'
import { withAuditTrail } from './audit'
import { createMockApi } from './mock'
import type { ApiClient } from './types'

const member: Viewer = { householdId: 'hh-sen', role: 'member' }
const admin: Viewer = { householdId: 'hh-chatterjee', role: 'admin' }

const api = () => withAuditTrail(createMockApi())

/**
 * Every method the contract has, found by looking rather than by remembering.
 *
 * The lists below are the decision, made once, about which methods change something and which
 * only read. Adding anything to `ApiClient` without putting it in one of them fails this test —
 * which is the only mechanism available here for the guarantee the database gets from a
 * trigger. In Postgres nothing reaching the tables can avoid the trail; here, something can,
 * so the something has to be caught at the door.
 */
const READS = [
  'events.listUpcoming', 'events.listPast', 'events.getNext', 'events.getBySlug', 'events.listAll',
  'festivals.list',
  'gallery.listRecentMedia', 'gallery.listAlbums', 'gallery.getAlbum', 'gallery.listAllAlbums',
  'news.listPosts', 'news.getPost', 'news.listAnnouncements', 'news.listNewsletters',
  'news.listAllPosts', 'news.listAllAnnouncements',
  'contact.listMessages',
  'portal.identify', 'portal.getHousehold', 'portal.listHouseholds', 'portal.listDirectory',
  'portal.listDocuments',
  'portal.listSignInAttempts', 'portal.exportHousehold', 'portal.listAttendance',
  'audit.list', 'settings.get',
  'volunteering.listOpenRoles', 'volunteering.listRolesForEvent',
]

/** Writes that leave a line in the trail. */
const AUDITED = [
  'contact.markHandled',
  'portal.addHousehold', 'portal.updateHousehold', 'portal.deleteHousehold', 'portal.resolveSignInAttempt', 'portal.recordAttendance',
  'gallery.createAlbum', 'gallery.updateAlbum', 'gallery.setCover', 'gallery.setCaption',
  'gallery.reorder', 'gallery.deleteMedia',
  'settings.save', 'events.save', 'events.create', 'events.archive',
  'news.createPost', 'news.updatePost',
  'news.createAnnouncement', 'news.updateAnnouncement', 'news.removeAnnouncement',
]

/**
 * Writes that deliberately do not. `send` matches the trigger, which is attached to
 * contact_messages for updates only: a line per visitor using the contact form would say
 * nothing the table does not already say.
 */
const NOT_AUDITED = ['contact.send']

function methodsOf(client: ApiClient): string[] {
  const found: string[] = []
  for (const [group, value] of Object.entries(client)) {
    if (typeof value !== 'object' || value === null) continue
    for (const [name, member] of Object.entries(value)) {
      if (typeof member === 'function') found.push(`${group}.${name}`)
    }
  }
  return found.sort()
}

describe('the contract', () => {
  it('has no method that nobody has decided about', () => {
    const declared = [...READS, ...AUDITED, ...NOT_AUDITED].sort()
    expect(methodsOf(api())).toEqual(declared)
  })
})

describe('every audited write', () => {
  /**
   * The bug this catches was written three times before it was noticed.
   *
   * The mock changes rows in place. Hold the row, write, then read the "before" values off it
   * and you get the new values twice, diff to nothing, and record nothing at all — a silently
   * empty trail, which is the one failure an audit trail must not have. It is invisible: the
   * write works, the screen updates, and only the line that was supposed to be kept is missing.
   */
  it('leaves a line behind, for each one', async () => {
    const a = api()
    const album = (await a.gallery.listAllAlbums(admin)).find((x) => x.media.length > 2)!
    const post = await a.news.createPost(
      { title: 'A first piece', excerpt: 'Something worth reading about.', body: 'x'.repeat(60), tags: [], author: 'Someone', published: true },
      admin,
    )
    const notice = await a.news.createAnnouncement(
      { title: 'Doors at six', body: 'The hall opens at six on Saturday.', pinned: false, audience: 'public', publishAt: '', expiresAt: '' },
      admin,
    )

    const writes: [string, () => Promise<unknown>][] = [
      ['contact.markHandled', async () => {
        const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy && m.kind !== 'photo')!
        return a.contact.markHandled(message.id, admin)
      }],
      ['gallery.updateAlbum', () => a.gallery.updateAlbum(album.id, { title: 'A different name', visibility: 'public' }, admin)],
      ['gallery.setCover', () => a.gallery.setCover(album.id, album.media[1].id, admin)],
      ['gallery.setCaption', () => a.gallery.setCaption(album.media[0].id, 'A caption', admin)],
      ['gallery.reorder', () => a.gallery.reorder(album.id, [...album.media].reverse().map((m) => m.id), admin)],
      ['news.updatePost', () => a.news.updatePost(post.id, { title: post.title, excerpt: post.excerpt, body: post.body, tags: [], author: post.author, published: false }, admin)],
      ['news.updateAnnouncement', () => a.news.updateAnnouncement(notice.id, { title: 'Doors at half five', body: notice.body, pinned: true, audience: 'public', publishAt: '', expiresAt: '' }, admin)],
      ['news.removeAnnouncement', () => a.news.removeAnnouncement(notice.id, admin)],
      ['gallery.deleteMedia', () => a.gallery.deleteMedia(album.media[2].id, admin)],
    ]

    for (const [name, run] of writes) {
      const before = (await a.audit.list(admin, 1000)).length
      await run()
      const after = (await a.audit.list(admin, 1000)).length
      expect(after, `${name} recorded nothing`).toBeGreaterThan(before)
    }
  })
})

describe('the audit trail', () => {
  it('records a write without the caller asking it to', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy && m.kind !== 'photo')!
    await a.contact.markHandled(message.id, admin)

    const trail = await a.audit.list(admin)
    expect(trail).toHaveLength(1)
    expect(trail[0].action).toBe('messages:handle')
    expect(trail[0].subject).toEqual({ kind: 'contact_messages', id: message.id })
  })

  it('keeps what the value was as well as what it became', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy && m.kind !== 'photo')!
    await a.contact.markHandled(message.id, admin)

    const [entry] = await a.audit.list(admin)
    // The name rather than the id: this is what the inbox prints, and the trail should record
    // what a reader would have seen. Who did it is kept separately, as `actorHouseholdId`.
    expect(entry.changes.handledBy).toEqual({ from: undefined, to: 'The Chatterjees' })
  })

  it('names who did it', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy && m.kind !== 'photo')!
    await a.contact.markHandled(message.id, admin)
    expect((await a.audit.list(admin))[0].actorHouseholdId).toBe('hh-chatterjee')
  })

  it('records nothing when the write was refused', async () => {
    const a = api()
    await expect(a.contact.markHandled('cm-1', member)).rejects.toThrow()
    expect(await a.audit.list(admin)).toEqual([])
  })

  it('does not record a visitor using the contact form', async () => {
    const a = api()
    await a.contact.send({ name: 'A Visitor', email: 'v@example.com', subject: 'Hello', message: 'Long enough to pass.' })
    expect(await a.audit.list(admin)).toEqual([])
  })

  it('is the committee\'s to read, and nobody else\'s', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy && m.kind !== 'photo')!
    await a.contact.markHandled(message.id, admin)

    expect(await a.audit.list(member)).toEqual([])
    expect(await a.audit.list(null)).toEqual([])
  })

  it('writes no line for a change that changed nothing', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy && m.kind !== 'photo')!
    await a.contact.markHandled(message.id, admin)
    await a.contact.markHandled(message.id, admin)
    // Twice, same value the second time. One line, not two.
    expect(await a.audit.list(admin)).toHaveLength(1)
  })

  it('says what an erased household was, since nothing else will', async () => {
    const a = api()
    await a.portal.deleteHousehold('hh-sen', admin)

    const [entry] = await a.audit.list(admin)
    expect(entry.action).toBe('household:remove')
    expect(entry.subject).toEqual({ kind: 'households', id: 'hh-sen' })
    // Read before the row went: afterwards there is nothing left to describe.
    expect(entry.changes.name.from).toBe('The Sens')
    expect(entry.changes.name.to).toBeUndefined()
  })

  it('reads newest first, and stops where it is asked to', async () => {
    const a = api()
    const messages = await a.contact.listMessages(admin)
    // A takedown needs a note, so it is left out of a test that is about ordering.
    const unhandled = messages.filter((m) => !m.handledBy && m.kind !== 'photo').slice(0, 2)
    for (const m of unhandled) await a.contact.markHandled(m.id, admin)

    const trail = await a.audit.list(admin, 1)
    expect(trail).toHaveLength(1)
    expect((await a.audit.list(admin)).length).toBe(unhandled.length)
  })
})
