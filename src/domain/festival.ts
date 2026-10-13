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

/** The first month a season names, 0 for January; null when it names none ("Spring"). */
export function seasonMonth(season: string | undefined): number | null {
  if (!season) return null
  const lower = season.toLowerCase()
  let month: number | null = null
  let earliest = Infinity
  MONTHS.forEach((name, i) => {
    const at = lower.indexOf(name)
    if (at >= 0 && at < earliest) {
      earliest = at
      month = i
    }
  })
  return month
}

/**
 * The festival that comes round next, judged by its season alone: for when nothing has a date
 * and the page still wants to name what is coming. This month counts as next.
 */
export function nextFestivalBySeason(festivals: Festival[], now: Date): Festival | undefined {
  const month = now.getMonth()
  let best: { festival: Festival; wait: number } | undefined
  for (const festival of festivals) {
    const at = seasonMonth(festival.season)
    if (at === null) continue
    const wait = (at - month + 12) % 12
    if (!best || wait < best.wait) best = { festival, wait }
  }
  return best?.festival ?? festivals[0]
}

type Dated = { festivalId?: string; startsAt: string }

export type FestivalStatus =
  | { kind: 'next'; startsAt: string }
  | { kind: 'set'; startsAt: string }
  | { kind: 'held'; startsAt: string }
  | { kind: 'arranging' }

/**
 * Where a festival stands this year: the next thing on, dated, held in the last twelve months,
 * or still being arranged. Upcoming comes first; past evenings only count while they are recent.
 */
export function festivalStatus(id: string, upcoming: Dated[], past: Dated[], nextId: string | undefined, now: Date): FestivalStatus {
  const coming = upcoming.filter((e) => e.festivalId === id).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  if (coming) return { kind: nextId === id ? 'next' : 'set', startsAt: coming.startsAt }
  const yearAgo = new Date(now)
  yearAgo.setFullYear(now.getFullYear() - 1)
  const held = past
    .filter((e) => e.festivalId === id && new Date(e.startsAt) >= yearAgo)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]
  if (held) return { kind: 'held', startsAt: held.startsAt }
  return { kind: 'arranging' }
}
