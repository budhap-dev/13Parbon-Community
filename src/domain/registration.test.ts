import { totalsFor, type Registration, attendanceOf, pastRetention } from './registration'

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

describe('what is kept when the year is up', () => {
  const at = (day: string): Registration => ({
    id: `r-${day}`,
    eventId: 'ev-durga-2026',
    householdId: 'hh-sen',
    adults: 2,
    children: 1,
    helping: 'Decorations',
    notes: 'Vegetarian',
    registeredAt: `${day}T12:00:00`,
  })

  it('keeps how many came, and nothing about who', () => {
    const kept = attendanceOf('ev-durga-2026', '2026-10-10', [at('2026-09-01'), { ...at('2026-09-02'), adults: 3, children: 0 }])

    expect(kept).toEqual({ eventId: 'ev-durga-2026', heldOn: '2026-10-10', households: 2, adults: 5, children: 1 })
    // Nothing that is a fact about a household survives — not even a count of who wrote a note,
    // because that still says something about those households.
    expect(JSON.stringify(kept)).not.toMatch(/hh-sen|Vegetarian|Decorations/)
    expect(kept).not.toHaveProperty('helping')
    expect(kept).not.toHaveProperty('withNotes')
  })

  it('keeps a record even when nobody came', () => {
    expect(attendanceOf('ev-quiet', '2026-10-10', [])).toMatchObject({ households: 0, adults: 0, children: 0 })
  })

  it('finds the rows whose year is up', () => {
    const now = new Date('2027-09-15T12:00:00')
    const old = at('2026-09-01')
    const recent = at('2027-06-01')

    expect(pastRetention([old, recent], now)).toEqual([old])
  })

  it('keeps a row on the day it turns a year old, and drops it the day after', () => {
    const registered = '2026-09-15'
    expect(pastRetention([at(registered)], new Date('2027-09-15T12:00:00'))).toEqual([])
    expect(pastRetention([at(registered)], new Date('2027-09-16T12:00:01'))).toHaveLength(1)
  })
})
