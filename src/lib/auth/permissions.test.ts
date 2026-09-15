import { describe, expect, it } from 'vitest'
import type { Viewer } from '@/domain/household'
import { can, canStopBeingAdmin, type Action } from './permissions'

/**
 * Every role against every action, as a table.
 *
 * The table is typed `Record<Action, …>`, so adding an action to the union without deciding
 * who may do it stops this file compiling. That is the point: a permission with no stated
 * answer is the kind of thing that quietly defaults to whatever the first caller assumed.
 *
 * Each row should agree with the policy it mirrors in `supabase/portal.sql` and with
 * `lib/api/mock/rules.test.ts`. Where they ever disagree, the database is right.
 */

const visitor: Viewer = null
const member: Viewer = { householdId: 'hh-sen', role: 'member' }
const admin: Viewer = { householdId: 'hh-chatterjee', role: 'admin' }

const ours = { householdId: 'hh-sen' }
const theirs = { householdId: 'hh-ghosh' }

type Row = {
  /** A visitor, signed in to nothing. */
  visitor: boolean
  /** A member, asking about their own household. */
  own: boolean
  /** The same member, asking about somebody else's. */
  other: boolean
  admin: boolean
}

const table: Record<Action, Row> = {
  'portal:enter': { visitor: false, own: true, other: true, admin: true },
  'admin:enter': { visitor: false, own: false, other: false, admin: true },

  'household:read': { visitor: false, own: true, other: false, admin: true },
  'household:edit': { visitor: false, own: true, other: false, admin: true },
  'household:add': { visitor: false, own: false, other: false, admin: true },
  'household:remove': { visitor: false, own: false, other: false, admin: true },
  'households:list': { visitor: false, own: false, other: false, admin: true },

  // The three a member may not change even on their own row. In the database these are a
  // trigger, because row level security sees rows and not columns.
  'household:setRole': { visitor: false, own: false, other: false, admin: true },
  'household:setSignInAddress': { visitor: false, own: false, other: false, admin: true },
  'household:setMembership': { visitor: false, own: false, other: false, admin: true },

  'directory:read': { visitor: false, own: true, other: true, admin: true },
  'documents:read': { visitor: false, own: true, other: true, admin: true },
  'documents:manage': { visitor: false, own: false, other: false, admin: true },

  'registrations:read': { visitor: false, own: true, other: false, admin: true },
  'registrations:readForEvent': { visitor: false, own: false, other: false, admin: true },

  'signInAttempts:read': { visitor: false, own: false, other: false, admin: true },
  'signInAttempts:resolve': { visitor: false, own: false, other: false, admin: true },

  'messages:read': { visitor: false, own: false, other: false, admin: true },
  'messages:handle': { visitor: false, own: false, other: false, admin: true },
}

describe('can', () => {
  for (const [action, row] of Object.entries(table) as [Action, Row][]) {
    describe(action, () => {
      it(`is ${row.visitor} for a visitor`, () => {
        expect(can(visitor, action, ours)).toBe(row.visitor)
      })

      it(`is ${row.own} for a member asking about their own household`, () => {
        expect(can(member, action, ours)).toBe(row.own)
      })

      it(`is ${row.other} for a member asking about another household`, () => {
        expect(can(member, action, theirs)).toBe(row.other)
      })

      it(`is ${row.admin} for the committee`, () => {
        expect(can(admin, action, theirs)).toBe(row.admin)
      })
    })
  }

  it('refuses a member who names no household, rather than guessing they meant their own', () => {
    expect(can(member, 'household:read')).toBe(false)
    expect(can(member, 'household:edit')).toBe(false)
    expect(can(member, 'registrations:read')).toBe(false)
  })

  it('lets the committee do everything a member may', () => {
    const memberMay = (Object.entries(table) as [Action, Row][]).filter(([, row]) => row.own)
    for (const [action] of memberMay) expect(can(admin, action, ours)).toBe(true)
  })
})

describe('canStopBeingAdmin', () => {
  const others = 'hh-sen'

  it('lets one admin remove another while there are two', () => {
    expect(canStopBeingAdmin(admin, others, 2)).toBe(true)
  })

  it('refuses to remove the last admin, leaving nobody who can let anyone back in', () => {
    expect(canStopBeingAdmin(admin, others, 1)).toBe(false)
  })

  it('refuses an admin demoting themselves, however many there are', () => {
    expect(canStopBeingAdmin(admin, 'hh-chatterjee', 5)).toBe(false)
  })

  it('is not a member\'s decision at all', () => {
    expect(canStopBeingAdmin(member, others, 5)).toBe(false)
    expect(canStopBeingAdmin(visitor, others, 5)).toBe(false)
  })
})
