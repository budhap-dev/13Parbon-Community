import { describe, expect, it } from 'vitest'
import type { HouseholdDraft, Viewer } from '@/domain/household'
import { withAuditTrail } from './audit'
import { createMockApi } from './mock'

const visitor: Viewer = null
const member: Viewer = { householdId: 'hh-sen', role: 'member' }
const ghosh: Viewer = { householdId: 'hh-ghosh', role: 'member' }
const admin: Viewer = { householdId: 'hh-chatterjee', role: 'admin' }

const api = () => withAuditTrail(createMockApi())

describe('who may take a copy', () => {
  it('a household may take its own', async () => {
    expect((await api().portal.exportHousehold('hh-sen', member)).household.id).toBe('hh-sen')
  })

  it('a household may not take anybody else\'s, and is told nothing about whether it exists', async () => {
    const a = api()
    await expect(a.portal.exportHousehold('hh-ghosh', member)).rejects.toThrow(/no such household/i)
    await expect(a.portal.exportHousehold('hh-nothing', member)).rejects.toThrow(/no such household/i)
  })

  it('the committee may take any, which is what erasure needs', async () => {
    expect((await api().portal.exportHousehold('hh-sen', admin)).household.name).toBe('The Sens')
  })

  it('a visitor may take none', async () => {
    await expect(api().portal.exportHousehold('hh-sen', visitor)).rejects.toThrow(/no such household/i)
  })
})

describe('what is in it', () => {
  it('holds back nothing about the household itself, sign-in address included', async () => {
    const { household } = await api().portal.exportHousehold('hh-sen', member)
    expect(household.googleEmail).toBe('rina.sen@gmail.com')
    expect(household.membership.paidTo).toBeTruthy()
    expect(household.role).toBe('member')
  })

  it('includes every person, and the notes written about them', async () => {
    const { household } = await api().portal.exportHousehold('hh-sen', member)
    // Free text about a person is data about that person, and it is the part that gets forgotten.
    expect(household.people.map((p) => p.name)).toContain('Mira Sen')
    expect(household.people.some((p) => p.note)).toBe(true)
  })

  it('says we do not hold which events they came to, rather than saying nothing', async () => {
    const { notes } = await api().portal.exportHousehold('hh-sen', member)
    // We keep a count per event and nothing about who, so there is nothing here to list — and
    // an export that simply omitted attendance would read as "you never came to anything".
    expect(notes.join(' ')).toMatch(/do not record which events you came to/i)
  })

  it('finds messages sent from an address we hold for them', async () => {
    // contact_messages carries no household, so this is matched on the address.
    const { messages } = await api().portal.exportHousehold('hh-ghosh', ghosh)
    expect(messages.map((m) => m.subject)).toContain('Parking on the night')
  })

  it('does not hand somebody else\'s messages over', async () => {
    const { messages } = await api().portal.exportHousehold('hh-sen', member)
    expect(messages).toEqual([])
  })

  it('says that messages are matched by address, so an empty list is not read as "you sent none"', async () => {
    const { notes } = await api().portal.exportHousehold('hh-sen', member)
    expect(notes.join(' ')).toMatch(/matched to you by email/i)
  })

  it('says plainly that it cannot tell them which photographs they are in', async () => {
    const { notes } = await api().portal.exportHousehold('hh-sen', member)
    // Silence here would read as "there are none of you", which is not what we know.
    expect(notes.join(' ')).toMatch(/photograph/i)
    expect(notes.join(' ')).toMatch(/take down/i)
  })
})

describe('the changes it lists', () => {
  const draft: HouseholdDraft = {
    name: 'The Sens',
    contactName: 'Rina Sen',
    email: 'rina@example.com',
    people: [{ name: 'Rina Sen', ageGroup: 'adult' }],
    interests: [],
    googleEmail: 'rina.sen@gmail.com',
    role: 'member',
    membershipStatus: 'lapsed',
    membershipPaidTo: '2026-03-31',
  }

  it('records what moved', async () => {
    const a = api()
    await a.portal.updateHousehold('hh-sen', draft, admin)
    const { changes } = await a.portal.exportHousehold('hh-sen', member)

    expect(changes).toHaveLength(1)
    expect(changes[0].fields).toContain('membership')
  })

  it('never names the committee member who made the change', async () => {
    const a = api()
    await a.portal.updateHousehold('hh-sen', draft, admin)
    const { changes } = await a.portal.exportHousehold('hh-sen', member)

    // Which member of the committee acted is a fact about them, not about this household.
    expect(JSON.stringify(changes)).not.toMatch(/hh-chatterjee/)
    expect(Object.keys(changes[0])).toEqual(['action', 'at', 'fields'])
  })

  it('lists only changes to this household', async () => {
    const a = api()
    await a.portal.updateHousehold('hh-sen', draft, admin)
    const { changes } = await a.portal.exportHousehold('hh-ghosh', admin)
    expect(changes).toEqual([])
  })
})

describe('votes, quiz scores and suggestions', () => {
  it('a household’s own copy has every vote it cast, its scores and its suggestions', async () => {
    const a = api()
    await a.polls.vote('poll-picnic', 1, member)
    await a.polls.vote('poll-setup', 0, member)
    await a.quizzes.submit('quiz-words', [0, 1, 0], false, member)
    await a.suggestions.send({ kind: 'poll', prompt: 'Film night in January?', options: ['Yes', 'No'], note: '', credit: false }, member)

    const copy = await a.portal.exportHousehold('hh-sen', member)
    expect(copy.votes.map((v) => v.choice).sort()).toEqual(['Sunday 25 October', 'Yes', 'Yes, count us in'].sort())
    expect(copy.quizScores).toEqual([expect.objectContaining({ quiz: 'Bengali words for children', score: 2, total: 3, shownOnLeaderboard: false })])
    expect(copy.suggestions).toEqual([expect.objectContaining({ kind: 'poll', prompt: 'Film night in January?', status: 'pending' })])
  })

  /**
   * The export is not a way round the poll's promise. On a poll not marked named, nobody but
   * the household can see its vote — so a copy the committee takes shows only named polls, and
   * a note says why the list may be short.
   */
  it('the committee’s copy shows votes on named polls only, and says so', async () => {
    const copy = await api().portal.exportHousehold('hh-ghosh', admin)
    expect(copy.votes.map((v) => v.poll)).toEqual(['Can somebody from your household help set up the hall for Durga Puja?'])
    expect(copy.notes.some((n) => /nobody else — the committee included/.test(n))).toBe(true)
    expect(copy.quizScores).toHaveLength(1)
    expect(copy.suggestions).toHaveLength(2)
  })

  it('the household’s own copy of the same household has every vote', async () => {
    expect((await api().portal.exportHousehold('hh-ghosh', ghosh)).votes).toHaveLength(3)
  })
})
