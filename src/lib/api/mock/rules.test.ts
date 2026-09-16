import { describe, expect, it } from 'vitest'
import type { HouseholdDraft, Viewer } from '@/domain/household'
import { createMockApi } from './index'

/**
 * The same rules as supabase/portal.sql, asked of the mock.
 *
 * The point of this file is that the mock must never be more generous than the database. A
 * screen built against a permissive mock is a screen written in the belief that it may ask
 * for anything, and the bill for that belief arrives as a wall of 403s on the day the real
 * adapter lands — or, worse, as a leak, if the adapter is written to match the interface
 * rather than the policy.
 *
 * Each block below has a matching one in supabase/verify.sql. If the two ever disagree, the
 * database is the one telling the truth and this file is the bug.
 */

const visitor: Viewer = null
const member: Viewer = { householdId: 'hh-sen', role: 'member' }
const otherMember: Viewer = { householdId: 'hh-ghosh', role: 'member' }
const admin: Viewer = { householdId: 'hh-chatterjee', role: 'admin' }

const api = () => createMockApi()

describe('a visitor', () => {
  it('reaches nothing behind the sign-in', async () => {
    const a = api()
    expect(await a.portal.listHouseholds(visitor)).toEqual([])
    expect(await a.portal.listDirectory(visitor)).toEqual([])
    expect(await a.portal.listDocuments(visitor)).toEqual([])
    expect(await a.portal.listSignInAttempts(visitor)).toEqual([])
    expect(await a.contact.listMessages(visitor)).toEqual([])
  })

  it('cannot fetch a household by guessing its id', async () => {
    expect(await api().portal.getHousehold('hh-sen', visitor)).toBeNull()
  })

  it('cannot handle a message', async () => {
    await expect(api().contact.markHandled('cm-1', visitor)).rejects.toThrow(/not allowed/i)
  })
})

describe('a member', () => {
  it('reads their own household', async () => {
    const household = await api().portal.getHousehold('hh-sen', member)
    expect(household?.name).toBe('The Sens')
  })

  it('cannot read anybody else\'s, and is told nothing about whether it exists', async () => {
    expect(await api().portal.getHousehold('hh-chatterjee', member)).toBeNull()
    expect(await api().portal.getHousehold('hh-nobody-at-all', member)).toBeNull()
  })

  it('cannot list the households', async () => {
    expect(await api().portal.listHouseholds(member)).toEqual([])
  })

  it('cannot read the committee\'s inbox or who has been knocking', async () => {
    const a = api()
    expect(await a.contact.listMessages(member)).toEqual([])
    expect(await a.portal.listSignInAttempts(member)).toEqual([])
    await expect(a.contact.markHandled('cm-1', member)).rejects.toThrow(/not allowed/i)
  })

  it('reads the headcounts, which name nobody', async () => {
    expect((await api().portal.listAttendance(member)).length).toBeGreaterThan(0)
  })

  it('cannot record one', async () => {
    const draft = { eventId: 'ev-x', heldOn: '2026-10-10', households: 1, adults: 2, children: 0 }
    await expect(api().portal.recordAttendance(draft, member)).rejects.toThrow(/committee/i)
  })

  it('reads the documents library', async () => {
    expect((await api().portal.listDocuments(member)).length).toBeGreaterThan(0)
  })
})

describe('the directory', () => {
  it('carries no name of any person, ever', async () => {
    const entries = await api().portal.listDirectory(member)
    const text = JSON.stringify(entries)
    expect(text).not.toMatch(/Mira Sen/)
    expect(entries.every((e) => !('people' in e))).toBe(true)
  })

  it('leaves out a household that chose not to appear', async () => {
    const entries = await api().portal.listDirectory(member)
    expect(entries.some((e) => e.id === 'hh-mitra')).toBe(false)
  })

  it('leaves out a household whose membership has lapsed', async () => {
    const entries = await api().portal.listDirectory(member)
    expect(entries.some((e) => e.id === 'hh-palit')).toBe(false)
  })

  it('shares only what each household agreed to share', async () => {
    const entries = await api().portal.listDirectory(member)
    const sens = entries.find((e) => e.id === 'hh-sen')
    // The Sens share an address and withhold a number, and that is what arrives.
    expect(sens?.email).toBeTruthy()
    expect(sens?.phone).toBeUndefined()
  })

  it('is closed to anybody not signed in', async () => {
    expect(await api().portal.listDirectory(visitor)).toEqual([])
  })

  it('looks the same to every member, so nothing leaks through whose turn it is', async () => {
    const a = api()
    expect(await a.portal.listDirectory(member)).toEqual(await a.portal.listDirectory(otherMember))
  })
})

describe('the committee', () => {
  it('reads every household', async () => {
    expect((await api().portal.listHouseholds(admin)).length).toBeGreaterThan(1)
  })

  it('reads a household that is not their own', async () => {
    expect((await api().portal.getHousehold('hh-sen', admin))?.name).toBe('The Sens')
  })

  it('reads the inbox and who has been knocking', async () => {
    const a = api()
    expect((await a.contact.listMessages(admin)).length).toBeGreaterThan(0)
    expect((await a.portal.listSignInAttempts(admin)).length).toBeGreaterThan(0)
  })

})

describe('marking a message handled', () => {
  it('records who dealt with it, and the inbox says so afterwards', async () => {
    const a = api()
    // Not simply the first: a takedown now sorts to the top and needs a note.
    const first = (await a.contact.listMessages(admin)).find((m) => m.kind !== 'photo')!
    expect(first.handledBy).toBeUndefined()

    // The household's name, because the inbox prints this column straight out and "handled by
    // hh-chatterjee" tells a reader nothing.
    const updated = await a.contact.markHandled(first.id, admin)
    expect(updated.handledBy).toBe('The Chatterjees')

    const after = await a.contact.listMessages(admin)
    expect(after.find((m) => m.id === first.id)?.handledBy).toBe('The Chatterjees')
  })

  it('refuses a message that is not there', async () => {
    await expect(api().contact.markHandled('cm-nope', admin)).rejects.toThrow(/not allowed/i)
  })
})

/**
 * The rules a form cannot be trusted to keep.
 *
 * A draft is whatever the browser chose to send. `HouseholdForm` does not draw the committee's
 * fields for a member, but that is a fact about the form, not about the request — so every one
 * of them is refused here too, which is what the trigger in portal.sql does and why it exists.
 */
describe('a member saving their own household', () => {
  const draftOf = (over: Partial<HouseholdDraft> = {}): HouseholdDraft => ({
    name: 'The Sens',
    contactName: 'Rina Sen',
    email: 'rina@example.com',
    people: [{ name: 'Rina Sen', ageGroup: 'adult' }],
    interests: [],
    listedInDirectory: true,
    shareEmail: true,
    sharePhone: false,
    ...over,
  })

  it('saves what is theirs to save', async () => {
    const a = api()
    const saved = await a.portal.updateHousehold('hh-sen', draftOf({ sharePhone: true }), member)
    expect(saved.sharePhone).toBe(true)
    expect(saved.contactName).toBe('Rina Sen')
  })

  it('cannot promote itself, however the draft was put together', async () => {
    const a = api()
    await expect(a.portal.updateHousehold('hh-sen', draftOf({ role: 'admin' }), member)).rejects.toThrow(/role/i)
    expect((await a.portal.getHousehold('hh-sen', member))?.role).toBe('member')
  })

  it('cannot change the address that signs it in', async () => {
    const a = api()
    await expect(
      a.portal.updateHousehold('hh-sen', draftOf({ googleEmail: 'someone.else@gmail.com' }), member),
    ).rejects.toThrow(/sign-in address/i)
  })

  it('cannot mark itself paid up', async () => {
    const a = api()
    await expect(
      a.portal.updateHousehold('hh-sen', draftOf({ membershipPaidTo: '2099-01-01' }), member),
    ).rejects.toThrow(/membership/i)
  })

  /*
   * The other side of the rule above, and the one that bites in practice.
   *
   * Every household the committee writes down has a null renewal date — the status column
   * defaults to active and the date column has no default — while the form hands back an
   * empty string for a date nobody set. Compared without normalising, "I changed nothing" reads
   * as an attempted change and an ordinary member is refused for saving their own address.
   */
  it('may still save its own details when nobody has set a renewal date', async () => {
    const a = api()
    const admin = { householdId: 'hh-chatterjee', role: 'admin' } as const
    await a.portal.updateHousehold('hh-sen', draftOf({ membershipPaidTo: '' }), admin)

    const saved = await a.portal.updateHousehold(
      'hh-sen',
      draftOf({ contactName: 'Rina Sen-Gupta', membershipPaidTo: '' }),
      member,
    )
    expect(saved.contactName).toBe('Rina Sen-Gupta')
    expect(saved.membership.paidTo).toBeNull()
  })

  it('cannot save somebody else\'s, and is told nothing about whether it exists', async () => {
    const a = api()
    await expect(a.portal.updateHousehold('hh-ghosh', draftOf(), member)).rejects.toThrow(/no such household/i)
    await expect(a.portal.updateHousehold('hh-nothing', draftOf(), member)).rejects.toThrow(/no such household/i)
  })

  it('cannot invite anybody', async () => {
    await expect(api().portal.addHousehold(draftOf(), member)).rejects.toThrow(/committee/i)
  })

  it('cannot save a household with nobody grown up in it', async () => {
    const a = api()
    const children = draftOf({ people: [{ name: 'Mira Sen', ageGroup: 'child', age: 7 }] })
    await expect(a.portal.updateHousehold('hh-sen', children, member)).rejects.toThrow(/not complete/i)
  })
})

describe('the committee managing households', () => {
  const draft: HouseholdDraft = {
    name: 'The Newly Invited',
    contactName: 'A Newcomer',
    email: 'new@example.com',
    people: [{ name: 'A Newcomer', ageGroup: 'adult' }],
    interests: [],
    listedInDirectory: false,
    shareEmail: false,
    sharePhone: false,
    googleEmail: 'newcomer@gmail.com',
    role: 'member',
    membershipStatus: 'active',
    membershipPaidTo: '2027-03-31',
  }

  it('invites a household, and it can be found by the address afterwards', async () => {
    const a = api()
    const added = await a.portal.addHousehold(draft, admin)
    expect(added.name).toBe('The Newly Invited')
    expect((await a.portal.identify('newcomer@gmail.com'))?.id).toBe(added.id)
  })

  it('refuses a sign-in address that already belongs to somebody', async () => {
    const a = api()
    await expect(a.portal.addHousehold({ ...draft, googleEmail: 'rina.sen@gmail.com' }, admin)).rejects.toThrow(
      /already belongs/i,
    )
  })

  it('leaves the address empty when the invitation has not been taken up', async () => {
    const added = await api().portal.addHousehold({ ...draft, googleEmail: null }, admin)
    expect(added.googleEmail).toBeNull()
  })

  it('may change a role, unlike a member', async () => {
    const a = api()
    const saved = await a.portal.updateHousehold('hh-sen', { ...draft, role: 'admin' }, admin)
    expect(saved.role).toBe('admin')
  })

  it('will not demote the last admin, leaving nobody able to let anyone back in', async () => {
    const a = api()
    const admins = (await a.portal.listHouseholds(admin)).filter((h) => h.role === 'admin')
    // Step them down one at a time; the final one must refuse.
    for (const h of admins.slice(0, -1)) {
      await a.portal.updateHousehold(h.id, { ...draft, role: 'member' }, admin)
    }
    const last = admins[admins.length - 1]
    await expect(a.portal.updateHousehold(last.id, { ...draft, role: 'member' }, admin)).rejects.toThrow(/last admin/i)
    expect((await a.portal.getHousehold(last.id, admin))?.role).toBe('admin')
  })
})

describe('somebody knocking', () => {
  it('is only the committee\'s to deal with', async () => {
    const a = api()
    await expect(a.portal.resolveSignInAttempt('sa-1', member)).rejects.toThrow(/committee/i)
    expect(await a.portal.listSignInAttempts(member)).toEqual([])
  })

  it('is kept once dealt with, not deleted', async () => {
    const a = api()
    await a.portal.resolveSignInAttempt('sa-1', admin)
    const attempts = await a.portal.listSignInAttempts(admin)
    // Somebody turned away twice should not read as somebody turned away once.
    expect(attempts.find((x) => x.id === 'sa-1')?.resolved).toBe(true)
  })

  it('leaves the others alone', async () => {
    const a = api()
    await a.portal.resolveSignInAttempt('sa-1', admin)
    const attempts = await a.portal.listSignInAttempts(admin)
    expect(attempts.filter((x) => !x.resolved)).toHaveLength(1)
  })

  it('says nothing about one that was never there', async () => {
    await expect(api().portal.resolveSignInAttempt('sa-nope', admin)).rejects.toThrow(/no such/i)
  })
})

describe('erasing a household', () => {
  it('is not a member\'s to do', async () => {
    await expect(api().portal.deleteHousehold('hh-ghosh', member)).rejects.toThrow(/committee/i)
  })

  it('takes the household and the people in it', async () => {
    const a = api()
    await a.portal.deleteHousehold('hh-sen', admin)
    expect(await a.portal.getHousehold('hh-sen', admin)).toBeNull()
  })

  it('leaves the headcounts alone, because there is nobody in them', async () => {
    const a = api()
    const before = await a.portal.listAttendance(admin)
    await a.portal.deleteHousehold('hh-sen', admin)
    // Erasing a household does not thin out the history: the counts name nobody.
    expect(await a.portal.listAttendance(admin)).toEqual(before)
  })

  it('takes them out of the directory as well', async () => {
    const a = api()
    await a.portal.deleteHousehold('hh-sen', admin)
    const entries = await a.portal.listDirectory(otherMember)
    expect(entries.some((e) => e.id === 'hh-sen')).toBe(false)
  })

  it('frees the Google address, so they can be invited back', async () => {
    const a = api()
    await a.portal.deleteHousehold('hh-sen', admin)
    expect(await a.portal.identify('rina.sen@gmail.com')).toBeNull()
  })

  it('refuses an admin removing their own household', async () => {
    const a = api()
    await expect(a.portal.deleteHousehold('hh-chatterjee', admin)).rejects.toThrow(/your own/i)
  })

  it('refuses the last admin, so the committee cannot erase its way out', async () => {
    const a = api()
    const admins = (await a.portal.listHouseholds(admin)).filter((h) => h.role === 'admin')
    const others = admins.filter((h) => h.id !== 'hh-chatterjee')
    for (const h of others) await a.portal.deleteHousehold(h.id, admin)
    // Only the acting admin is left, and they are refused twice over.
    await expect(a.portal.deleteHousehold('hh-chatterjee', admin)).rejects.toThrow(/your own/i)
  })

  it('says nothing about a household that was never there', async () => {
    await expect(api().portal.deleteHousehold('hh-nothing', admin)).rejects.toThrow(/no such household/i)
  })

  // The trail is the wrapper's job, so what erasure leaves behind is checked in audit.test.ts.
  // This file tests the bare mock on purpose: these are the rules, not the recording of them.
})

describe('identifying somebody at sign-in', () => {
  it('finds the household recorded against an address', async () => {
    const who = await api().portal.identify('rina.sen@gmail.com')
    expect(who).toEqual({ id: 'hh-sen', name: 'The Sens', role: 'member' })
  })

  it('does not mind what case the address was typed in', async () => {
    expect((await api().portal.identify('RINA.SEN@GMAIL.COM'))?.id).toBe('hh-sen')
  })

  it('returns nothing for an address the committee has not recorded', async () => {
    expect(await api().portal.identify('stranger@example.com')).toBeNull()
  })
})
