import { totalsFor, type Registration } from './registration'

const r = (adults: number, children: number, helping?: string, notes?: string): Registration => ({
  id: Math.random().toString(),
  eventId: 'e1',
  householdId: 'h1',
  adults,
  children,
  helping,
  notes,
  registeredAt: '2026-09-01T10:00:00',
})

describe('totalsFor', () => {
  it('adds up households, people, offers of help and notes', () => {
    expect(totalsFor([r(2, 1, 'Cooking'), r(2, 0), r(1, 2, undefined, 'No nuts')])).toEqual({
      households: 3,
      adults: 5,
      children: 3,
      people: 8,
      helping: 1,
      withNotes: 1,
    })
  })

  it('is all zeroes when nobody has registered', () => {
    expect(totalsFor([])).toEqual({ households: 0, adults: 0, children: 0, people: 0, helping: 0, withNotes: 0 })
  })
})
