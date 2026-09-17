import {
  addDays,
  daysUntil,
  describeCountdown,
  formatDayMonth,
  formatDateWithYear,
  formatLongDate,
  formatMonthYear,
  formatTime,
  isUpcoming,
  monthKey,
  startOfDay,
  forDateTimeInput,
  fromDateTimeInput,
} from './dates'

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

  it('formats a long date, and one with the year where that matters', () => {
    expect(formatLongDate('2026-10-05T18:00:00')).toBe('Monday 5 October')
    expect(formatDateWithYear('2027-03-31')).toBe('31 March 2027')
  })

  it('formats a time, a month heading and a month key', () => {
    expect(formatTime('2026-10-10T17:00:00')).toBe('5:00 pm')
    expect(formatMonthYear('2026-10-10T17:00:00')).toBe('October 2026')
    expect(monthKey('2026-10-10T17:00:00')).toBe('2026-10')
    expect(monthKey('2027-02-11T10:00:00')).toBe('2027-02')
  })

  it('describes a countdown', () => {
    expect(describeCountdown(32)).toEqual({ value: '32', label: 'days to go' })
    expect(describeCountdown(1)).toEqual({ value: '1', label: 'day to go' })
    expect(describeCountdown(0).value).toBe('Today')
    expect(describeCountdown(-1).value).toBe('Now')
  })
})

/*
 * The bug this pair exists for, found on 2026-09-17 after an afternoon chasing a notice that
 * would not appear. Six notices were posted; every one was stored an hour in the future and was
 * invisible to everybody, while the screen that wrote them said they were up.
 *
 * The old code sliced the ISO string to the first sixteen characters, which does not convert
 * anything — it relabels a UTC wall clock as a local one. In winter the two agree and nothing
 * looks wrong, which is why this would have come back every spring.
 */
describe('dates that go in and out of a datetime-local field', () => {
  const inBritishSummerTime = '2026-09-17T12:50:00.000Z' // 13:50 in London

  it('shows an instant as the local wall clock, not the UTC one', () => {
    // The slice it replaces would have said 12:50 here, an hour early.
    const shown = forDateTimeInput(inBritishSummerTime)
    expect(shown).toMatch(/^2026-09-17T\d\d:\d\d$/)
    expect(shown).toBe(
      `2026-09-17T${String(new Date(inBritishSummerTime).getHours()).padStart(2, '0')}:50`,
    )
  })

  it('reads what somebody typed as their own time, not as UTC', () => {
    const typed = '2026-09-17T13:50'
    // Writing the field's own string would have stored 13:50 UTC. This stores the instant that
    // 13:50 actually was where the person was standing.
    expect(fromDateTimeInput(typed)).toBe(new Date(typed).toISOString())
    expect(new Date(fromDateTimeInput(typed)).getHours()).toBe(13)
  })

  it('survives the round trip, which the slice also did — and is why it looked fine', () => {
    const typed = '2026-09-17T13:50'
    expect(forDateTimeInput(fromDateTimeInput(typed))).toBe(typed)
  })

  it('treats an empty field as no date at all', () => {
    expect(fromDateTimeInput('')).toBe('')
    expect(fromDateTimeInput('   ')).toBe('')
    expect(forDateTimeInput(undefined)).toBe('')
    expect(forDateTimeInput(null)).toBe('')
    // Rubbish in a field is not a date either, and must not become "Invalid Date".
    expect(fromDateTimeInput('not a date')).toBe('')
    expect(forDateTimeInput('not a date')).toBe('')
  })
})
