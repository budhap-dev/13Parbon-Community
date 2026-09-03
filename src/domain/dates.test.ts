import { addDays, daysUntil, describeCountdown, formatDayMonth, formatLongDate, isUpcoming, startOfDay } from './dates'

const now = new Date('2026-09-03T10:30:00')

describe('dates', () => {
  it('startOfDay zeroes the time', () => {
    expect(startOfDay(now).getHours()).toBe(0)
    expect(startOfDay(now).getDate()).toBe(3)
  })

  it('addDays moves forward and back', () => {
    expect(addDays(now, 32).getMonth()).toBe(9)
    expect(addDays(now, -3).getDate()).toBe(31)
  })

  it('daysUntil counts whole calendar days regardless of time of day', () => {
    expect(daysUntil('2026-09-03T23:00:00', now)).toBe(0)
    expect(daysUntil('2026-09-04T01:00:00', now)).toBe(1)
    expect(daysUntil('2026-10-05T18:00:00', now)).toBe(32)
    expect(daysUntil('2026-09-01T18:00:00', now)).toBe(-2)
  })

  it('isUpcoming treats today as upcoming', () => {
    expect(isUpcoming('2026-09-03T01:00:00', now)).toBe(true)
    expect(isUpcoming('2026-09-02T23:00:00', now)).toBe(false)
  })

  it('formats a day and month stamp', () => {
    expect(formatDayMonth('2026-10-05T18:00:00')).toEqual({ day: '05', month: 'OCT' })
  })

  it('formats a long date', () => {
    expect(formatLongDate('2026-10-05T18:00:00')).toBe('Monday 5 October')
  })

  it('describes a countdown', () => {
    expect(describeCountdown(32)).toEqual({ value: '32', label: 'days to go' })
    expect(describeCountdown(1)).toEqual({ value: '1', label: 'day to go' })
    expect(describeCountdown(0).value).toBe('Today')
    expect(describeCountdown(-1).value).toBe('Now')
  })
})
