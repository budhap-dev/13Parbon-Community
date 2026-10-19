import { addCivilDays, civilDaysBetween } from '@/domain/bengaliDate'
import type { Ritual } from '@/domain/ritual'
import type { SiteTheme } from '@/domain/siteContent'
import { rituals as enteredRituals } from '../bengaliYear'

/** How many days either side of an occasion its colours are worn. */
export const SEASON_DAYS = 5

/**
 * Which of the calendar's occasions each festival theme belongs to. The site wears it from five
 * days before the first day to five days after the last, and the committee's own choice the rest
 * of the year.
 */
export const SEASONS: { theme: SiteTheme; ritual: string }[] = [
  { theme: 'poila-boishakh', ritual: 'poila-boishakh' },
  { theme: 'mahalaya', ritual: 'mahalaya' },
  { theme: 'festival', ritual: 'durga-puja' },
  { theme: 'kojagori', ritual: 'lakshmi-puja' },
  { theme: 'deepavali', ritual: 'kali-puja' },
  { theme: 'saraswati', ritual: 'saraswati-puja' },
  { theme: 'holi', ritual: 'dol' },
]

/**
 * Borodin is Christmas, which no panjika moves: the 25th of December every year, kept here
 * rather than among the rituals because it is not one of the Bengali calendar's own.
 */
const BORODIN = (year: number): Ritual => ({
  id: 'borodin',
  name: 'Borodin',
  bengaliName: 'বড়দিন',
  kind: 'festival',
  date: `${year}-12-25`,
  description: '',
})

export type Season = { theme: SiteTheme; name: string; start: string; end: string }

/** Every window of colour the calendar knows of, with Borodin added for the years either side. */
function seasonsAround(today: string, list: Ritual[]): Season[] {
  const year = Number(today.slice(0, 4))
  const occasions = [
    ...SEASONS.flatMap(({ theme, ritual }) => list.filter((r) => r.id === ritual).map((r) => ({ theme, ritual: r }))),
    ...[year - 1, year, year + 1].map((y) => ({ theme: 'borodin' as const, ritual: BORODIN(y) })),
  ]
  return occasions.map(({ theme, ritual }) => ({
    theme,
    name: ritual.name,
    start: addCivilDays(ritual.date, -SEASON_DAYS),
    end: addCivilDays(ritual.until ?? ritual.date, SEASON_DAYS),
  }))
}

/**
 * The festival a day falls in the colours of, if any.
 *
 * Where two windows meet — Mahalaya and Durga Puja, a week apart, or Durga Puja and Lakshmi Puja,
 * four days apart — they do not overlap: each day goes to the occasion nearer it, so the two
 * split the days between them. On a tie the one still to come wins: the site turns towards
 * what is next rather than lingering on what is over.
 */
export function seasonFor(today: string, list: Ritual[] = enteredRituals): Season | null {
  const distance = (season: Season) => {
    const core = { start: addCivilDays(season.start, SEASON_DAYS), end: addCivilDays(season.end, -SEASON_DAYS) }
    if (today < core.start) return civilDaysBetween(today, core.start)
    if (today > core.end) return civilDaysBetween(core.end, today)
    return 0
  }
  const inSeason = seasonsAround(today, list).filter((season) => season.start <= today && today <= season.end)
  inSeason.sort((a, b) => distance(a) - distance(b) || b.start.localeCompare(a.start))
  return inSeason[0] ?? null
}
