import { describe, expect, it } from 'vitest'
import type { Viewer } from '@/domain/household'
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

  it('reads their own registrations and not another household\'s', async () => {
    const a = api()
    const mine = await a.portal.listRegistrationsForHousehold('hh-sen', member)
    expect(mine.every((r) => r.householdId === 'hh-sen')).toBe(true)
    expect(await a.portal.listRegistrationsForHousehold('hh-ghosh', member)).toEqual([])
  })

  it('cannot see who is coming to an event', async () => {
    expect(await api().portal.listRegistrationsForEvent('ev-durga-2026', member)).toEqual([])
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

  it('sees who is coming to an event', async () => {
    const a = api()
    const event = await a.events.getNext()
    expect((await a.portal.listRegistrationsForEvent(event!.id, admin)).length).toBeGreaterThan(0)
  })
})

describe('marking a message handled', () => {
  it('records who dealt with it, and the inbox says so afterwards', async () => {
    const a = api()
    const [first] = await a.contact.listMessages(admin)
    expect(first.handledBy).toBeUndefined()

    const updated = await a.contact.markHandled(first.id, admin)
    expect(updated.handledBy).toBe('hh-chatterjee')

    const after = await a.contact.listMessages(admin)
    expect(after.find((m) => m.id === first.id)?.handledBy).toBe('hh-chatterjee')
  })

  it('refuses a message that is not there', async () => {
    await expect(api().contact.markHandled('cm-nope', admin)).rejects.toThrow(/not allowed/i)
  })
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
