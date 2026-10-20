import { slugFrom } from './slug'

/**
 * A newsflash: a ribbon under the header on every public page, for as long as the committee
 * says. A new feature, a night the site is down for maintenance, a change of venue.
 *
 * Held in the site's settings row like the sponsors, so the committee writes one in the portal
 * and it is up straight away. That row is read with the anon key by anybody who goes looking,
 * and a newsflash is public by nature, so nothing goes in here that is not fit to print.
 */

/**
 * The looks. The kind is the committee's own words; how loud it is, is this. Theme wears the
 * site's own colours, so it changes with the festival; the other three stay put.
 */
export const NEWSFLASH_COLOURS = ['theme', 'gold', 'dark', 'alert'] as const
export type NewsflashColour = (typeof NEWSFLASH_COLOURS)[number]

export const NEWSFLASH_COLOUR_LABELS: Record<NewsflashColour, string> = {
  theme: 'The website’s theme',
  gold: 'Gold',
  dark: 'Dark',
  alert: 'Alert',
}

/**
 * How it moves. Each is small on purpose: a ribbon that dances is read as an advert. A visitor
 * whose device asks for less motion sees every one of them standing still.
 */
export const NEWSFLASH_ANIMATIONS = ['drop', 'shine', 'pulse', 'twinkle', 'colour', 'zoom', 'marquee', 'nudge', 'none'] as const
export type NewsflashAnimation = (typeof NEWSFLASH_ANIMATIONS)[number]

export const NEWSFLASH_ANIMATION_LABELS: Record<NewsflashAnimation, string> = {
  drop: 'Drops in when the page opens',
  shine: 'A shine sweeps across it',
  pulse: 'The button gently pulses',
  twinkle: 'The sparkle in the tag twinkles',
  colour: 'The headlines change colour',
  zoom: 'The headlines gently zoom',
  marquee: 'The words scroll across, like a news ticker',
  nudge: 'The arrow on the button nudges',
  none: 'No animation',
}

/**
 * How many may be up at once. One ribbon carries them with "1 of 3" arrows; past three nobody
 * reads to the end, and the ones at the back are the ones that needed saying.
 */
export const NEWSFLASH_MAX_AT_ONCE = 3

export const NEWSFLASH_TAG_MAX = 24
export const NEWSFLASH_HEADLINE_MAX = 60
export const NEWSFLASH_LINE_MAX = 140
export const NEWSFLASH_BUTTON_MAX = 30

export type Newsflash = {
  /** Kept when the words change, so a visitor who closed it does not see it again. */
  id: string
  /** The kind, in the little tag at the start: "New feature", "Maintenance". Required. */
  tag: string
  /** The same in Bengali. Empty leaves the tag in English only. */
  tagBn: string
  /** The headline in Bengali. One of the two headlines is required. */
  headlineBn: string
  /** The headline in English. */
  headline: string
  /** One line after the headline. */
  line: string
  /** A page on this site, "/calendar". Empty is a newsflash with no button. */
  to: string
  /** What the button says. Empty with a page reads "Take a look". */
  button: string
  colour: NewsflashColour
  /** How it moves. Saved before there was a choice, it drops in. */
  animation: NewsflashAnimation
  /** Whether a visitor may close it. Off for maintenance and anything they must not miss. */
  closable: boolean
  /** Ahead of the others while more than one is up. */
  first: boolean
  /** When it goes up and comes down, as instants. It is up from `from` until just before `until`. */
  from: string
  until: string
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/**
 * A page on this site, and nothing else: it ends up in a link, and a newsflash is not the place
 * to send people off the site.
 */
export function isSitePath(value: string): boolean {
  return /^\/[A-Za-z0-9\-._~/]*(#[A-Za-z0-9\-_]*)?$/.test(value.trim()) && !value.trim().startsWith('//')
}

const isMoment = (value: string): boolean => value !== '' && !Number.isNaN(new Date(value).getTime())

export const blankNewsflash = (now: Date): Newsflash => {
  const from = new Date(now)
  from.setSeconds(0, 0)
  const until = new Date(from)
  until.setDate(until.getDate() + 14)
  return {
    id: '',
    tag: '',
    tagBn: '',
    headlineBn: '',
    headline: '',
    line: '',
    to: '',
    button: '',
    colour: 'gold',
    animation: 'drop',
    closable: true,
    first: false,
    from: from.toISOString(),
    until: until.toISOString(),
  }
}

/**
 * The list as it should be saved: a row with no tag, no headline or no proper dates is not a
 * row yet, and a link is kept only if it is a page on this site. In the order the committee gave.
 */
export function tidyNewsflashes(rows: readonly Partial<Newsflash>[]): Newsflash[] {
  const taken = new Set<string>()
  const tidy: Newsflash[] = []
  for (const row of rows) {
    const tag = str(row.tag).slice(0, NEWSFLASH_TAG_MAX).trim()
    const headlineBn = str(row.headlineBn).slice(0, NEWSFLASH_HEADLINE_MAX).trim()
    const headline = str(row.headline).slice(0, NEWSFLASH_HEADLINE_MAX).trim()
    const from = str(row.from)
    const until = str(row.until)
    if (!tag || !(headlineBn || headline) || !isMoment(from) || !isMoment(until)) continue
    if (new Date(until) <= new Date(from)) continue
    // Named from its words and the day it goes up, so two "New feature"s a month apart are two.
    const base = `${slugFrom(headline || tag) || 'newsflash'}-${from.slice(0, 10).replace(/-/g, '')}`
    let id = /^[a-z0-9][a-z0-9-]*$/.test(str(row.id)) ? str(row.id) : base
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`
    taken.add(id)
    const to = isSitePath(str(row.to)) ? str(row.to) : ''
    tidy.push({
      id,
      tag,
      tagBn: str(row.tagBn).slice(0, NEWSFLASH_TAG_MAX).trim(),
      headlineBn,
      headline,
      line: str(row.line).slice(0, NEWSFLASH_LINE_MAX).trim(),
      to,
      button: to ? str(row.button).slice(0, NEWSFLASH_BUTTON_MAX).trim() : '',
      colour: (NEWSFLASH_COLOURS as readonly unknown[]).includes(row.colour) ? (row.colour as NewsflashColour) : 'gold',
      animation: (NEWSFLASH_ANIMATIONS as readonly unknown[]).includes(row.animation)
        ? (row.animation as NewsflashAnimation)
        : 'drop',
      closable: row.closable !== false,
      first: row.first === true,
      from: new Date(from).toISOString(),
      until: new Date(until).toISOString(),
    })
  }
  return tidy
}

/** Whatever the database handed back, kept only where it is fit to draw. Null if it was not a list. */
export function readNewsflashes(value: unknown): Newsflash[] | null {
  if (!Array.isArray(value)) return null
  return tidyNewsflashes(
    value.filter((row): row is Partial<Newsflash> => !!row && typeof row === 'object' && !Array.isArray(row)),
  )
}

const isUp = (flash: Newsflash, at: Date): boolean => new Date(flash.from) <= at && at < new Date(flash.until)

/** "Show first" ones ahead, then the earliest to go up, then the committee's order. */
function byPriority(a: Newsflash, b: Newsflash): number {
  if (a.first !== b.first) return a.first ? -1 : 1
  return new Date(a.from).getTime() - new Date(b.from).getTime()
}

/**
 * What the ribbon carries now: the ones that are up, less any this visitor closed, at most
 * three. The limit is enforced on save, but a list that somehow holds four still draws three.
 */
export function newsflashesUp(rows: readonly Newsflash[], now: Date, closed: readonly string[] = []): Newsflash[] {
  return rows
    .filter((flash) => isUp(flash, now))
    .sort(byPriority)
    .slice(0, NEWSFLASH_MAX_AT_ONCE)
    .filter((flash) => !(flash.closable && closed.includes(flash.id)))
}

/**
 * The first moment more than three would be up at once, or null if there is none.
 *
 * The most that are up together is always reached at somebody's start, so only the starts need
 * looking at.
 */
export function tooManyAt(rows: readonly Newsflash[]): string | null {
  const starts = [...rows].map((flash) => flash.from).sort()
  for (const start of starts) {
    const at = new Date(start)
    if (rows.filter((flash) => isUp(flash, at)).length > NEWSFLASH_MAX_AT_ONCE) return start
  }
  return null
}

/** Where one stands, in the committee's words: up now, waiting, or over. */
export function newsflashState(flash: Newsflash, now: Date): 'up' | 'waiting' | 'over' {
  if (isUp(flash, now)) return 'up'
  return new Date(flash.from) > now ? 'waiting' : 'over'
}

/** The ids worth remembering as closed: ones that are still in the list. */
export function stillClosed(closed: readonly string[], rows: readonly Newsflash[]): string[] {
  const ids = new Set(rows.map((flash) => flash.id))
  return closed.filter((id, i) => ids.has(id) && closed.indexOf(id) === i)
}

/**
 * Why a row in the portal would not be saved, in the committee's words. Empty when it would.
 * Said beside the row, because a row that vanished on save would look like a save that failed.
 */
export function newsflashProblems(row: Newsflash): string[] {
  const problems: string[] = []
  if (!row.tag.trim()) problems.push('Say what kind it is, in English.')
  if (!row.headlineBn.trim() && !row.headline.trim()) problems.push('Give it a headline, in Bengali or English.')
  if (!isMoment(row.from) || !isMoment(row.until)) problems.push('Give it a day and time to go up and to come down.')
  else if (new Date(row.until) <= new Date(row.from)) problems.push('It has to come down after it goes up.')
  if (row.to.trim() && !isSitePath(row.to)) problems.push('The link has to be a page on this site, starting with /, such as /calendar.')
  return problems
}
