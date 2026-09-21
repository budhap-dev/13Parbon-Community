import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Viewer } from '@/domain/household'
import { createMockApi } from '../mock'
import { withSupabasePortal } from './portal'

/**
 * That the back office is wired to the right method, with the right arguments.
 *
 * `wiring.test.ts` already checks that every method on this slice stops being the fixture
 * one — which catches a section left on sample data entirely. It cannot catch the subtler
 * version: a wrapper that swapped the method but hands it the wrong thing, or the right
 * thing in the wrong order. `updateHousehold(id, draft, viewer)` and
 * `recordAttendance(draft)` are three arguments and one, next to each other in the same
 * object literal, and both would typecheck if the wrong pair were passed along.
 *
 * So this calls each one and watches what the layer underneath was asked for. The methods
 * themselves are stubs: what is being tested is the wiring, and `portalData.ts` has its own
 * tests for the queries.
 */

const methods = {
  identify: vi.fn(async () => null),
  getHousehold: vi.fn(async () => null),
  listHouseholds: vi.fn(async () => []),
  listSignInAttempts: vi.fn(async () => []),
  listAttendance: vi.fn(async () => []),
  addHousehold: vi.fn(async () => ({}) as never),
  updateHousehold: vi.fn(async () => ({}) as never),
  deleteHousehold: vi.fn(async () => {}),
  resolveSignInAttempt: vi.fn(async () => ({}) as never),
  recordAttendance: vi.fn(async () => ({}) as never),
  exportHousehold: vi.fn(async () => ({}) as never),
}

const inbox = {
  listMessages: vi.fn(async () => []),
  markHandled: vi.fn(async () => ({}) as never),
  deleteMessage: vi.fn(async () => {}),
}

vi.mock('./portalData', () => ({
  householdMethods: () => methods,
  inboxMethods: () => inbox,
}))

const config = { url: 'https://project.supabase.co', anonKey: 'anon-key' }
const admin: Viewer = { householdId: 'hh-1', role: 'admin' }

const wired = () => withSupabasePortal(createMockApi(), config)

beforeEach(() => {
  for (const fn of [...Object.values(methods), ...Object.values(inbox)]) fn.mockClear()
})

describe('the committee’s screens', () => {
  it('asks the database for the households, not the fixtures', async () => {
    const api = wired()
    await api.portal.listHouseholds(admin)
    await api.portal.listSignInAttempts(admin)
    await api.portal.listAttendance(admin)
    expect(methods.listHouseholds).toHaveBeenCalled()
    expect(methods.listSignInAttempts).toHaveBeenCalled()
    expect(methods.listAttendance).toHaveBeenCalled()
  })

  it('looks a household up by the address that signed in', async () => {
    await wired().portal.identify('rina.sen@gmail.com')
    expect(methods.identify).toHaveBeenCalledWith('rina.sen@gmail.com')
  })

  it('passes an id through for the reads that take one', async () => {
    const api = wired()
    await api.portal.getHousehold('hh-sen', admin)
    await api.portal.exportHousehold('hh-sen', admin)
    expect(methods.getHousehold).toHaveBeenCalledWith('hh-sen')
    expect(methods.exportHousehold).toHaveBeenCalledWith('hh-sen')
  })
})

describe('the committee’s writes', () => {
  /**
   * The viewer travels with the writes that need it and not with the reads.
   *
   * Not an oversight either way: the policies answer a read for whoever is asking, so a
   * viewer would be ignored, while `addHousehold` and `updateHousehold` need it to record
   * who acted and to refuse a member the committee's fields.
   */
  it('carries the draft and who is acting', async () => {
    const api = wired()
    const draft = { name: 'The Roys', contactName: 'A Roy', people: [], interests: [] }
    await api.portal.addHousehold(draft, admin)
    await api.portal.updateHousehold('hh-sen', draft, admin)
    expect(methods.addHousehold).toHaveBeenCalledWith(draft, admin)
    expect(methods.updateHousehold).toHaveBeenCalledWith('hh-sen', draft, admin)
  })

  it('carries an attendance count as the draft it is', async () => {
    const draft = { eventId: 'ev-1', heldOn: '2026-04-18', households: 40, adults: 90, children: 30 }
    await wired().portal.recordAttendance(draft, admin)
    expect(methods.recordAttendance).toHaveBeenCalledWith(draft)
  })

  it('removes a household and resolves a knock by id', async () => {
    const api = wired()
    await api.portal.deleteHousehold('hh-sen', admin)
    await api.portal.resolveSignInAttempt('sa-1', admin)
    expect(methods.deleteHousehold).toHaveBeenCalledWith('hh-sen')
    expect(methods.resolveSignInAttempt).toHaveBeenCalledWith('sa-1')
  })
})

describe('the inbox', () => {
  /*
   * The half-wired case this whole file exists for. `withSupabaseWrites` posts a visitor's
   * message to the real table; if the reading half stayed on fixtures, every message sent
   * through the live site would land somewhere nobody in the app could see, and the committee
   * would be looking at sample data believing it was real.
   */
  it('reads from the same table the contact form writes to', async () => {
    await wired().contact.listMessages(admin)
    expect(inbox.listMessages).toHaveBeenCalled()
  })

  it('carries the note when a message is marked handled', async () => {
    await wired().contact.markHandled('cm-1', admin, 'Deleted the photograph')
    expect(inbox.markHandled).toHaveBeenCalledWith('cm-1', admin, 'Deleted the photograph')
  })

  it('deletes by id', async () => {
    await wired().contact.deleteMessage('cm-1', admin)
    expect(inbox.deleteMessage).toHaveBeenCalledWith('cm-1')
  })

  /** Sending belongs to the public website, which has no session and posts under the anon key. */
  it('leaves sending alone', () => {
    const base = createMockApi()
    expect(withSupabasePortal(base, config).contact.send).toBe(base.contact.send)
  })
})
