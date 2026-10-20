/**
 * The Bengali calendar as West Bengal keeps it, worked out from the sun, by either of its two
 * panjikas. docs/CALENDAR.md says more about the two.
 *
 * Not the Bangladesh calendar, where 1 Boishakh is 14 April every year and the months have fixed
 * lengths. Here a month begins when the sun enters the next sign of the sidereal zodiac — its
 * sankranti — so a month runs 29 to 32 days and Poila Boishakh is the 14th or the 15th of April.
 *
 * The two panjikas differ in where they say the sun is. The Bisuddha Siddhanta, the default
 * everywhere, uses the sun as it is, worked out below. The Surya Siddhanta of the Gupta Press and
 * Benimadhab Sil almanacs uses the old tables in ./suryaSiddhanta, and its sankranti can be the
 * best part of a day later, so about a third of its months start a day after the Bisuddha's.
 *
 * The rule for which day a month begins: a sankranti between sunrise and midnight starts the
 * month the next day, and one after midnight starts it the day after that. Days in the panjika
 * run sunrise to sunrise, so a sankranti at 3 in the morning belongs to the day before — and both
 * halves of the rule come to the same thing: the month begins on the civil day after the
 * sankranti's date in Kolkata. Midnight in India is the only line that matters.
 *
 * The sun's place is the low-precision solution from Meeus, Astronomical Algorithms ch. 25, good
 * to about a hundredth of a degree, which is a quarter of an hour of the sun's travel. Only a
 * sankranti within those minutes of midnight could land on the wrong day, and the panjikas
 * themselves disagree by more than that, so the tests pin the years against published dates.
 *
 * Dates are civil days, written "2026-10-19", with no time and no timezone in them. A day in the
 * Bengali calendar is the same day in London as in Kolkata; only the sankranti is an instant.
 */

import { sankrantiAfter } from './suryaSiddhanta'

export type BengaliMonth = {
  /** As the site spells it in English. */
  name: string
  /** In Bengali script. */
  bengaliName: string
}

/** From Boishakh, the first month of the year. */
export const BENGALI_MONTHS: readonly BengaliMonth[] = [
  { name: 'Boishakh', bengaliName: 'বৈশাখ' },
  { name: 'Joishtho', bengaliName: 'জ্যৈষ্ঠ' },
  { name: 'Asharh', bengaliName: 'আষাঢ়' },
  { name: 'Shrabon', bengaliName: 'শ্রাবণ' },
  { name: 'Bhadro', bengaliName: 'ভাদ্র' },
  { name: 'Ashwin', bengaliName: 'আশ্বিন' },
  { name: 'Kartik', bengaliName: 'কার্তিক' },
  { name: 'Agrahayan', bengaliName: 'অগ্রহায়ণ' },
  { name: 'Poush', bengaliName: 'পৌষ' },
  { name: 'Magh', bengaliName: 'মাঘ' },
  { name: 'Falgun', bengaliName: 'ফাল্গুন' },
  { name: 'Choitro', bengaliName: 'চৈত্র' },
]

/** Sunday first, as the panjika and the site's own calendars both start the week. */
export const BENGALI_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'] as const

/** The Bengali year begins this many years after the Christian one, give or take April. */
export const BANGABDA_OFFSET = 593

const DAY_MS = 86_400_000
const IST_MS = 5.5 * 3_600_000
const J2000 = 2_451_545
const UNIX_EPOCH_JD = 2_440_587.5

const radians = (deg: number) => (deg * Math.PI) / 180
const turn = (deg: number) => ((deg % 360) + 360) % 360

/** Days since 1 January 1970 for a civil date. */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

function isoFromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}

/** The civil date a number of days on from another. */
export function addCivilDays(iso: string, days: number): string {
  return isoFromDayNumber(dayNumber(iso) + days)
}

/** Whole days from one civil date to another; negative when `to` is earlier. */
export function civilDaysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

/** 0 for Sunday. */
export function weekdayOf(iso: string): number {
  return (dayNumber(iso) + 4) % 7
}

/**
 * A civil date in English words. Read as midnight UTC and written in UTC, so the day cannot
 * slip either way whatever timezone the reader's device is in.
 */
export function formatCivil(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(new Date(dayNumber(iso) * DAY_MS))
}

/** Today's civil date where the reader is, not in UTC: a quarter past midnight is tomorrow. */
export function civilDate(at: Date): string {
  const two = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`
}

/** Terrestrial Time runs this many seconds ahead of the clock. NASA's fit for 2005–2050. */
function deltaT(year: number): number {
  const t = year - 2000
  return 62.92 + 0.32217 * t + 0.005589 * t * t
}

/** The sun's longitude from the start of Aries in the sidereal zodiac, Lahiri's, in degrees. */
function sunSiderealLongitude(jdUt: number): number {
  const year = 2000 + (jdUt - J2000) / 365.25
  const T = (jdUt + deltaT(year) / 86_400 - J2000) / 36_525
  const L0 = 280.46646 + 36_000.76983 * T + 0.0003032 * T * T
  const M = radians(357.52911 + 35_999.05029 * T - 0.0001537 * T * T)
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M)
  // Against the mean equinox, with aberration. Nutation is left out of both sides: the true
  // longitude and the true ayanamsa carry the same nutation, which cancels.
  const tropical = L0 + C - 0.00569
  // Lahiri (Chitrapaksha) ayanamsa: 23.8572° at J2000, carried on by general precession.
  const ayanamsa = 23.857_17 + (5028.796_195 * T + 1.105_434_8 * T * T) / 3600
  return turn(tropical - ayanamsa)
}

/** The instant, as a Julian day, the sun reaches a sidereal longitude, starting near a guess. */
function sankranti(target: number, guessJd: number): number {
  let jd = guessJd
  for (let i = 0; i < 8; i++) {
    const behind = turn(target - sunSiderealLongitude(jd) + 180) - 180
    jd += behind / 0.9856
    if (Math.abs(behind) < 1e-7) break
  }
  return jd
}

/** When the sun enters a month's sign, for month 0–11 of a Bengali year. */
export function sankrantiAt(bengaliYear: number, month: number): Date {
  const gregorian = bengaliYear + BANGABDA_OFFSET
  // Mesha sankranti is around 14 April; each sign after it about a twelfth of a year on.
  const guess = Date.UTC(gregorian, 3, 14) / DAY_MS + UNIX_EPOCH_JD + month * 30.44
  return new Date((sankranti(month * 30, guess) - UNIX_EPOCH_JD) * DAY_MS)
}

/**
 * Which panjika: the Surya Siddhanta, which the Benimadhab Sil and Gupta Press almanacs on so many
 * kitchen walls follow, and which the calendar page opens on; or the Bisuddha Siddhanta, which
 * drikpanchang, Belur Math and the West Bengal holiday list follow. The page's own default first.
 */
export type Panjika = 'bisuddha' | 'surya'

export const PANJIKAS: readonly { id: Panjika; name: string; bengaliName: string }[] = [
  { id: 'surya', name: 'Benimadhab Sil', bengaliName: 'বেণীমাধব শীল' },
  { id: 'bisuddha', name: 'Bisuddha Siddhanta', bengaliName: 'বিশুদ্ধ সিদ্ধান্ত' },
]

/** What the calendar page opens on, until a reader chooses. */
export const DEFAULT_PANJIKA: Panjika = 'surya'

export const isPanjika = (value: unknown): value is Panjika => PANJIKAS.some((p) => p.id === value)

/** When the sun enters a month's sign, for month 0–11 of a Bengali year, by either panjika. */
export function sankrantiBy(panjika: Panjika, bengaliYear: number, month: number): Date {
  if (panjika === 'bisuddha') return sankrantiAt(bengaliYear, month)
  // A fortnight before the Bisuddha's: the Surya Siddhanta's is never more than a day or two off.
  return sankrantiAfter(month, new Date(sankrantiAt(bengaliYear, month).getTime() - 15 * DAY_MS))
}

/**
 * The first day of each month as the almanac prints it, for the years read from it. Used in place
 * of the sums, which put a month a day early now and then: in 1433 they start Bhadro and Ashwin
 * on the 18th, from sankrantis at 23:11 and 23:39, and the almanac starts both on the 19th.
 *
 * 1433 is read from the Benimadhab Sil panjika's own dates and weekdays, and agrees with every
 * Gupta Press date quoted in the papers; see docs/CALENDAR.md.
 */
const PRINTED_SURYA_MONTHS: Record<number, string[]> = {
  1433: ['2026-04-15', '2026-05-16', '2026-06-16', '2026-07-18', '2026-08-19', '2026-09-19', '2026-10-19', '2026-11-18', '2026-12-17', '2027-01-16', '2027-02-14', '2027-03-16'],
}

/** A sankranti this near midnight in India could fall either side of it in the almanac. */
const CLOSE_TO_MIDNIGHT_MS = 90 * 60_000

/**
 * How sure the page can be of where a month begins and ends by a panjika: the Bisuddha
 * Siddhanta's are pinned against drikpanchang; the Gupta Press ones are 'printed' when read from
 * the almanac, 'worked-out' when only summed, and 'close' when a sankranti at either end is near
 * enough midnight for the almanac to put it a day the other way.
 */
export function monthCertainty(year: number, month: number, panjika: Panjika): 'printed' | 'worked-out' | 'close' {
  if (panjika === 'bisuddha') return 'printed'
  const ends = [month, month + 1].map((m) => ({ year: year + Math.floor(m / 12), month: m % 12 }))
  if (ends.every((end) => PRINTED_SURYA_MONTHS[end.year])) return 'printed'
  const close = ends.some((end) => {
    if (PRINTED_SURYA_MONTHS[end.year]) return false
    const at = sankrantiBy('surya', end.year, end.month).getTime() + IST_MS
    const fromMidnight = at - Math.floor(at / DAY_MS) * DAY_MS
    return Math.min(fromMidnight, DAY_MS - fromMidnight) < CLOSE_TO_MIDNIGHT_MS
  })
  return close ? 'close' : 'worked-out'
}

const startsCache = new Map<string, string[]>()

/**
 * The first day of each month of a Bengali year, and the first day of the next year after them:
 * thirteen dates, so month m runs from `starts[m]` up to the day before `starts[m + 1]`.
 */
export function monthStarts(bengaliYear: number, panjika: Panjika = 'bisuddha'): string[] {
  const key = `${panjika}-${bengaliYear}`
  const cached = startsCache.get(key)
  if (cached) return cached
  const starts = Array.from({ length: 13 }, (_, i) => {
    const year = bengaliYear + Math.floor(i / 12)
    const printed = panjika === 'surya' ? PRINTED_SURYA_MONTHS[year]?.[i % 12] : undefined
    if (printed) return printed
    const at = sankrantiBy(panjika, year, i % 12)
    const kolkataDate = new Date(at.getTime() + IST_MS).toISOString().slice(0, 10)
    return addCivilDays(kolkataDate, 1)
  })
  startsCache.set(key, starts)
  return starts
}

export type BengaliDate = {
  year: number
  /** 0 for Boishakh. */
  month: number
  /** From 1. */
  day: number
}

/** The Bengali date of a civil date. */
export function toBengali(iso: string, panjika: Panjika = 'bisuddha'): BengaliDate {
  const gregorian = Number(iso.slice(0, 4))
  // A date before Poila Boishakh still belongs to the year that began the April before.
  let year = gregorian - BANGABDA_OFFSET
  if (iso < monthStarts(year, panjika)[0]) year -= 1
  const starts = monthStarts(year, panjika)
  let month = 11
  while (iso < starts[month]) month -= 1
  return { year, month, day: civilDaysBetween(starts[month], iso) + 1 }
}

/** The civil date of a Bengali date. A day past the end of the month runs into the next. */
export function fromBengali({ year, month, day }: BengaliDate, panjika: Panjika = 'bisuddha'): string {
  return addCivilDays(monthStarts(year, panjika)[month], day - 1)
}

/** How many days a month of a Bengali year has: 29 to 32. */
export function monthLength(year: number, month: number, panjika: Panjika = 'bisuddha'): number {
  const starts = monthStarts(year, panjika)
  return civilDaysBetween(starts[month], starts[month + 1])
}

const DIGITS = '০১২৩৪৫৬৭৮৯'

/** A number in Bengali digits: 1433 as ১৪৩৩. */
export function bengaliDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => DIGITS[Number(d)])
}

/** "২ কার্তিক ১৪৩৩" */
export function formatBengaliDate(date: BengaliDate): string {
  return `${bengaliDigits(date.day)} ${BENGALI_MONTHS[date.month].bengaliName} ${bengaliDigits(date.year)}`
}

/** "2 Kartik 1433", for the reader who does not read Bengali script. */
export function formatBengaliDateInEnglish(date: BengaliDate): string {
  return `${date.day} ${BENGALI_MONTHS[date.month].name} ${date.year}`
}

