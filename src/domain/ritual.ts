import { addCivilDays, civilDate, monthLength, monthStarts, weekdayOf } from './bengaliDate'
import { isCancelled, type Event } from './event'

/**
 * What the Bengali calendar marks: the pujas and vratas, the festivals and sankrantis, and the
 * days Bengalis keep for their poets and their language. The community's own evenings come from
 * the events, not from here, and sit among these as a fourth kind.
 */
export type RitualKind = 'puja' | 'festival' | 'cultural'
export type EntryKind = RitualKind | 'evening'

export const ENTRY_KINDS: { kind: EntryKind; label: string }[] = [
  { kind: 'puja', label: 'Puja' },
  { kind: 'festival', label: 'Festival' },
  { kind: 'cultural', label: 'Cultural day' },
  { kind: 'evening', label: 'Our evening' },
]

export const kindLabel = (kind: EntryKind) => ENTRY_KINDS.find((k) => k.kind === kind)?.label ?? ''

export type RitualDay = {
  date: string
  name: string
  bengaliName?: string
}

/**
 * A moment in an occasion, from the Kolkata panjika: the tithi it is kept in, a muhurat for the
 * puja itself, or the instant of a sankranti, which has no end.
 *
 * Instants written with their offset — "2026-10-18T12:41+05:30" — exactly as the panjika gives
 * them in India, and shown on the page in UK time with Kolkata's beside it.
 */
export type RitualTime = {
  /** "Ashtami tithi", "Sandhi Puja", "Sankranti". */
  label: string
  from: string
  to?: string
}

export type Ritual = {
  /** Stays as it is from year to year, so "lakshmi-puja" is the same thing in 1433 and 1434. */
  id: string
  name: string
  bengaliName: string
  kind: RitualKind
  /** Its civil date, "2026-10-17"; the first, when it runs over several. */
  date: string
  /** The last day, when it runs over several. */
  until?: string
  /** The name of each day, for a puja whose days have names of their own. */
  days?: RitualDay[]
  /** What it is, for somebody who has never been. */
  description: string
  /** When it begins and ends by the panjika, where it has a time rather than a whole day. */
  times?: RitualTime[]
}

/** A ritual or an evening, as the calendar draws it. */
export type CalendarEntry = {
  /** Unique on the page: a ritual's id and year, or the evening's own. */
  key: string
  kind: EntryKind
  name: string
  bengaliName?: string
  start: string
  end: string
  days?: RitualDay[]
  description?: string
  times?: RitualTime[]
  /** Which drawing goes beside it; see RitualIcon. */
  icon?: string
  /** Where it goes: an evening's own page. */
  href?: string
}

export function ritualEntry(ritual: Ritual): CalendarEntry {
  return {
    key: `${ritual.id}-${ritual.date.slice(0, 4)}`,
    kind: ritual.kind,
    name: ritual.name,
    bengaliName: ritual.bengaliName,
    start: ritual.date,
    end: ritual.until ?? ritual.date,
    days: ritual.days,
    description: ritual.description,
    times: ritual.times,
    icon: ritual.id,
  }
}

/**
 * A published evening, on the day it starts where the reader is. A cancelled one stays off: the
 * calendar is what is on, and the Events page is where somebody finds out what is not.
 */
export function eveningEntry(event: Event): CalendarEntry | null {
  if (isCancelled(event) || event.status === 'draft') return null
  const day = civilDate(new Date(event.startsAt))
  return {
    key: `event-${event.id}`,
    kind: 'evening',
    name: event.title,
    start: day,
    end: day,
    description: event.summary,
    times: [{ label: 'Our evening', from: event.startsAt, to: event.endsAt || undefined }],
    icon: event.festivalId ? (FESTIVAL_ICONS[event.festivalId] ?? event.festivalId) : undefined,
    href: `/events/${event.slug}`,
  }
}

/** The community's festivals whose id is not the calendar's for the same occasion. */
const FESTIVAL_ICONS: Record<string, string> = { boishakhi: 'poila-boishakh', holi: 'dol' }

const UK = 'Europe/London'
const KOLKATA = 'Asia/Kolkata'

/** "Sun 18 Oct, 12:41 pm" in a timezone. */
function moment(iso: string, timeZone: string, withDay: boolean): string {
  const time = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }).format(new Date(iso))
  if (!withDay) return time
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(new Date(iso))
  return `${day}, ${time}`
}

const dayIn = (iso: string, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso))

/** Whether a time falls on any part of a day, by the UK clock. */
export function touchesDay(time: RitualTime, day: string): boolean {
  return dayIn(time.from, UK) <= day && dayIn(time.to ?? time.from, UK) >= day
}

/**
 * A time or a span as somebody here reads it: "Sun 18 Oct, 12:41 pm – Mon 19 Oct, 1:07 pm".
 * The second day is left out when the span starts and ends on the same one.
 */
export function formatSpan(time: RitualTime, timeZone: 'uk' | 'kolkata'): string {
  const zone = timeZone === 'uk' ? UK : KOLKATA
  const from = moment(time.from, zone, true)
  if (!time.to) return from
  return `${from} – ${moment(time.to, zone, dayIn(time.from, zone) !== dayIn(time.to, zone))}`
}

/** The entries that touch any day from `from` to `to`, in the order they begin. */
export function entriesBetween(entries: CalendarEntry[], from: string, to: string): CalendarEntry[] {
  return entries
    .filter((entry) => entry.start <= to && entry.end >= from)
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.name.localeCompare(b.name))
}

export const entriesOn = (entries: CalendarEntry[], day: string) => entriesBetween(entries, day, day)

/** The next entries from a day on, not counting any already under way. */
export function comingUp(entries: CalendarEntry[], today: string, limit = 3): CalendarEntry[] {
  return entriesBetween(entries, addCivilDays(today, 1), '9999-12-31')
    .filter((entry) => entry.start > today)
    .slice(0, limit)
}

/** A month of the Bengali year, by its place in the year: 0 for Boishakh. */
export type MonthRef = { year: number; month: number }

export function shiftMonth({ year, month }: MonthRef, by: number): MonthRef {
  const at = year * 12 + month + by
  return { year: Math.floor(at / 12), month: ((at % 12) + 12) % 12 }
}

export const compareMonths = (a: MonthRef, b: MonthRef) => a.year * 12 + a.month - (b.year * 12 + b.month)

/** "1433-07", the month as the address holds it, counting Boishakh as 01. */
export const monthParam = ({ year, month }: MonthRef) => `${year}-${String(month + 1).padStart(2, '0')}`

export function readMonthParam(value: string | null): MonthRef | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const month = Number(match[2]) - 1
  return month >= 0 && month < 12 ? { year: Number(match[1]), month } : null
}

export type MonthView = {
  first: string
  last: string
  length: number
  /**
   * Whole weeks from Sunday. The first and last run into the months either side, and those days
   * are here too, so the grid can show them faded rather than leave holes; anything before
   * `first` or after `last` belongs to a neighbour.
   */
  weeks: string[][]
}

export function monthView({ year, month }: MonthRef): MonthView {
  const first = monthStarts(year)[month]
  const length = monthLength(year, month)
  const start = addCivilDays(first, -weekdayOf(first))
  const days = Math.ceil((weekdayOf(first) + length) / 7) * 7
  const cells = Array.from({ length: days }, (_, i) => addCivilDays(start, i))
  const weeks = Array.from({ length: days / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
  return { first, last: addCivilDays(first, length - 1), length, weeks }
}
