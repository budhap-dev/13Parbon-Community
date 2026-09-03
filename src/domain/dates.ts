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
