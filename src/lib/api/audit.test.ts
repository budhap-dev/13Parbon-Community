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
  'events.listUpcoming', 'events.listPast', 'events.getNext', 'events.getBySlug',
  'festivals.list',
  'gallery.listRecentMedia', 'gallery.listAlbums', 'gallery.getAlbum',
  'news.listPosts', 'news.getPost', 'news.listAnnouncements', 'news.listNewsletters',
  'contact.listMessages',
  'portal.identify', 'portal.getHousehold', 'portal.listHouseholds', 'portal.listDirectory',
  'portal.listDocuments', 'portal.listRegistrationsForHousehold', 'portal.listRegistrationsForEvent',
  'portal.listSignInAttempts',
  'audit.list',
  'volunteering.listOpenRoles', 'volunteering.listRolesForEvent',
]

/** Writes that leave a line in the trail. */
const AUDITED = ['contact.markHandled', 'portal.addHousehold', 'portal.updateHousehold']

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

describe('the audit trail', () => {
  it('records a write without the caller asking it to', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy)!
    await a.contact.markHandled(message.id, admin)

    const trail = await a.audit.list(admin)
    expect(trail).toHaveLength(1)
    expect(trail[0].action).toBe('messages:handle')
    expect(trail[0].subject).toEqual({ kind: 'contact_messages', id: message.id })
  })

  it('keeps what the value was as well as what it became', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy)!
    await a.contact.markHandled(message.id, admin)

    const [entry] = await a.audit.list(admin)
    expect(entry.changes.handledBy).toEqual({ from: undefined, to: 'hh-chatterjee' })
  })

  it('names who did it', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy)!
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
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy)!
    await a.contact.markHandled(message.id, admin)

    expect(await a.audit.list(member)).toEqual([])
    expect(await a.audit.list(null)).toEqual([])
  })

  it('writes no line for a change that changed nothing', async () => {
    const a = api()
    const message = (await a.contact.listMessages(admin)).find((m) => !m.handledBy)!
    await a.contact.markHandled(message.id, admin)
    await a.contact.markHandled(message.id, admin)
    // Twice, same value the second time. One line, not two.
    expect(await a.audit.list(admin)).toHaveLength(1)
  })

  it('reads newest first, and stops where it is asked to', async () => {
    const a = api()
    const messages = await a.contact.listMessages(admin)
    const unhandled = messages.filter((m) => !m.handledBy).slice(0, 2)
    for (const m of unhandled) await a.contact.markHandled(m.id, admin)

    const trail = await a.audit.list(admin, 1)
    expect(trail).toHaveLength(1)
    expect((await a.audit.list(admin)).length).toBe(unhandled.length)
  })
})
