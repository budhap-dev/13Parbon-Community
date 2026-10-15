export type Festival = {
  id: string
  name: string
  /** Name in Bengali script, when known. */
  bengaliName?: string
  /** Roughly when it falls, since the dates move with the Bengali calendar. */
  season?: string
  /** What actually happens, for somebody who has never been. */
  description?: string
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/** Every month a season names, 0 for January, in the order it names them; empty for "Spring". */
export function seasonMonths(season: string | undefined): number[] {
  if (!season) return []
  const lower = season.toLowerCase()
  return MONTHS.map((name, i) => ({ i, at: lower.indexOf(name) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ i }) => i)
}

/** The first month a season names, 0 for January; null when it names none ("Spring"). */
export function seasonMonth(season: string | undefined): number | null {
  return seasonMonths(season)[0] ?? null
}

/**
 * Whole months until a season comes round, 0 while any month it names is this one: "September
 * or October" is on in October, not eleven months off. Null when the season names no month.
 */
export function monthsUntilSeason(season: string | undefined, now: Date): number | null {
  const months = seasonMonths(season)
  if (months.length === 0) return null
  return Math.min(...months.map((m) => (m - now.getMonth() + 12) % 12))
}

type Dated = { festivalId?: string; startsAt: string; status?: string }

/*
 * Each festival comes round once a year, so an evening held in the last six months is this
 * year's: the next one is next year's, however soon the season says it falls.
 */
const SEASON_MONTHS = 6

/** This year's evening for a festival, if it has been held. A cancelled one was not held. */
export function heldThisYear(id: string, past: Dated[], now: Date): Dated | undefined {
  const since = new Date(now)
  since.setMonth(now.getMonth() - SEASON_MONTHS)
  return past
    .filter((e) => e.festivalId === id && e.status !== 'cancelled' && new Date(e.startsAt) >= since && new Date(e.startsAt) <= now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]
}

export type FestivalStatus =
  | { kind: 'next'; startsAt: string }
  | { kind: 'set'; startsAt: string }
  | { kind: 'held'; startsAt: string }
  | { kind: 'arranging' }

/**
 * Where a festival stands this year: the next thing on, dated, held, or still being arranged.
 * Upcoming comes first; a past evening counts only while it is this year's.
 */
export function festivalStatus(id: string, upcoming: Dated[], past: Dated[], nextId: string | undefined, now: Date): FestivalStatus {
  const coming = upcoming.filter((e) => e.festivalId === id).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  if (coming) return { kind: nextId === id ? 'next' : 'set', startsAt: coming.startsAt }
  const held = heldThisYear(id, past, now)
  if (held) return { kind: 'held', startsAt: held.startsAt }
  return { kind: 'arranging' }
}
