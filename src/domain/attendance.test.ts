import { describe, expect, it } from 'vitest'
import { isValidAttendance, peopleAt, validateAttendance, type AttendanceDraft } from './attendance'

const draft: AttendanceDraft = {
  eventId: 'ev-durga-2026',
  heldOn: '2026-10-10',
  households: 63,
  adults: 180,
  children: 47,
}

describe('recording how many came', () => {
  it('takes a plain set of numbers', () => {
    expect(validateAttendance(draft)).toEqual({})
    expect(isValidAttendance(draft)).toBe(true)
  })

  it('wants to know which event, and when', () => {
    const errors = validateAttendance({ ...draft, eventId: '', heldOn: '' })
    expect(errors.eventId).toBeTruthy()
    expect(errors.heldOn).toBeTruthy()
  })

  it('takes nought, because an event nobody came to is a fact worth keeping', () => {
    expect(isValidAttendance({ ...draft, households: 0, adults: 0, children: 0 })).toBe(true)
  })

  it('refuses half a person, or a negative one', () => {
    expect(validateAttendance({ ...draft, adults: 12.5 }).adults).toBeTruthy()
    expect(validateAttendance({ ...draft, children: -1 }).children).toBeTruthy()
  })

  it('queries more households than adults, which is usually the columns swapped', () => {
    expect(validateAttendance({ ...draft, households: 180, adults: 63 }).households).toMatch(/right way round/)
  })

  it('does not query a household count with no adults recorded yet', () => {
    // Half-filled is not wrong, it is half-filled.
    expect(validateAttendance({ ...draft, households: 63, adults: 0 }).households).toBeUndefined()
  })

  it('adds everybody up for the hall and the caterer', () => {
    expect(peopleAt({ adults: 180, children: 47 })).toBe(227)
  })
})
