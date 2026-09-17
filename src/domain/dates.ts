const DAY_MS = 86_400_000

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Whole calendar days from today until the given date. Negative when it is in the past. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = startOfDay(new Date(iso))
  const today = startOfDay(now)
  return Math.round((target.getTime() - today.getTime()) / DAY_MS)
}

export function isUpcoming(iso: string, now: Date = new Date()): boolean {
  return daysUntil(iso, now) >= 0
}

export type DayMonth = { day: string; month: string }

/** "12" and "OCT", for date stamps. */
export function formatDayMonth(iso: string, locale = 'en-GB'): DayMonth {
  const date = new Date(iso)
  return {
    day: new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).toUpperCase(),
  }
}

/** "12 October 2026". Use where the year matters and the weekday does not. */
export function formatDateWithYear(iso: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

/** "Sunday 12 October" */
export function formatLongDate(iso: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(iso),
  )
}

/** "5:00 pm" */
export function formatTime(iso: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
}

/** "October 2026", for grouping a calendar by month. */
export function formatMonthYear(iso: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(iso))
}

/** "2026-10", a sortable key for the month an ISO timestamp falls in. */
export function monthKey(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export type Countdown = { value: string; label: string }

/** Turns a day count into the two-line countdown shown on the next-festival card. */
export function describeCountdown(days: number): Countdown {
  if (days < 0) return { value: 'Now', label: 'happening now' }
  if (days === 0) return { value: 'Today', label: 'see you there' }
  if (days === 1) return { value: '1', label: 'day to go' }
  return { value: String(days), label: 'days to go' }
}

/*
 * `<input type="datetime-local">` and the rest of the app do not mean the same thing by a date.
 *
 * The field has no timezone in it. It shows and returns a wall clock — "2026-09-17T13:50" — and
 * means it in whatever timezone the person is standing in. Everything else here is an instant,
 * written UTC with a Z, because that is what a `timestamptz` column holds and what two people in
 * two countries can agree on.
 *
 * Sliced from one to the other, as this was, the hours are simply relabelled. A notice put up at
 * 13:50 during British Summer Time was stored as 13:50 UTC, which is 14:50 here: an hour in the
 * future, invisible to everybody, and the screen that wrote it said it was up. In winter the two
 * agree and nothing looks wrong at all, which is the worst part — it would have come back every
 * spring. The same slice is in the event designer, where an evening typed as 18:00 goes on the
 * public page as 19:00.
 */

/** An instant, as the local wall clock a `datetime-local` field shows. Empty for no date. */
export function forDateTimeInput(iso?: string | null): string {
  if (!iso) return ''
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const two = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}T${two(at.getHours())}:${two(at.getMinutes())}`
}

/**
 * What a `datetime-local` field gives back, as an instant.
 *
 * `new Date('2026-09-17T13:50')` is local time by specification — a date-time with no offset is
 * the local one, where a date on its own would be UTC. That difference is the whole fix.
 */
export function fromDateTimeInput(value: string): string {
  if (!value.trim()) return ''
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? '' : at.toISOString()
}
