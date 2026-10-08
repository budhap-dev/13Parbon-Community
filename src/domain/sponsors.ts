import { slugFrom } from './slug'

/**
 * The people and businesses who help pay for the year, and how the public site thanks them.
 *
 * Held in the site's settings row like the committee and the festivals, so the committee adds
 * one from the portal and it is on the site straight away. That row is read with the anon key
 * by anybody who goes looking — the public site needs it before anyone has signed in — so
 * nothing goes in here that is not fit to print: no amounts, no phone numbers, no notes about
 * who promised what. A sponsor that is hidden is not drawn; it is not secret.
 */

/** Gold, silver and friend: what a sponsor gave, as the site is allowed to say it. */
export const SPONSOR_LEVELS = ['gold', 'silver', 'friend'] as const
export type SponsorLevel = (typeof SPONSOR_LEVELS)[number]

export const SPONSOR_LEVEL_LABELS: Record<SponsorLevel, string> = {
  gold: 'Gold',
  silver: 'Silver',
  friend: 'Friend',
}

/** What each group is called on the public pages. Those with no level are thanked without one. */
export const GROUP_TITLES: Record<SponsorLevel | '', string> = {
  gold: 'Gold sponsors',
  silver: 'Silver sponsors',
  friend: 'Friends',
  '': 'With thanks to',
}

/**
 * How long a name and a line can be: as long as fits a tile and a card, which is shorter than
 * people would write if asked for "something about them".
 */
export const SPONSOR_NAME_MAX = 60
export const SPONSOR_BLURB_MAX = 140

/**
 * What makes a logo look right, said to the committee beside the upload. The sizes are what the
 * tiles are drawn at on a laptop; a logo at least twice that stays sharp on a phone's screen.
 */
export const LOGO_GUIDE = {
  files: 'PNG or JPG, up to 5 MB',
  smallest: 'At least 600 pixels wide',
  shape: 'Wider than tall suits it best — about 3 to 2. Square works. Wider than 4 to 1 comes out too small to read.',
  ground: 'Drawn on white, so ask for the version they print on paper, not one made for dark backgrounds.',
  sizes: [
    { where: 'Gold, home page', size: 'about 220 × 147' },
    { where: 'Silver, home page', size: 'about 160 × 107' },
    { where: 'Friends, home page', size: 'about 120 × 80' },
    { where: 'Gold, Sponsors page', size: 'the full width, 3 to 1' },
  ],
} as const

export type Sponsor = {
  /** Kept when the name changes, so React and the tests have something steady to hold. */
  id: string
  name: string
  /** An address this site serves or one over https. Empty draws the name in place of a logo. */
  logo: string
  /** Their own website, over https. Empty is a name with no link. */
  href: string
  /** One line about them, on the sponsors page. */
  blurb: string
  /** Empty is a sponsor with no level, listed after the levels. */
  level: SponsorLevel | ''
  /** The festivals they help put on, by id. A festival with two or more is co-sponsored. */
  festivalIds: string[]
  /** Whether the public site draws them at all. */
  shown: boolean
  /**
   * A person or a family rather than a business — "in memory of", say.
   *
   * A business putting its name to an evening is the point of sponsoring it. A person giving
   * money is not the same as a person agreeing to be named on a public website, so one of these
   * is never drawn until the committee has ticked that they said yes.
   */
  person: boolean
  /** That a person or family has said they are happy to be named. Means nothing for a business. */
  agreed: boolean
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** Their website: https and nothing else, because it ends up in an `href`. */
export function isSponsorLink(value: string): boolean {
  return /^https:\/\/\S+$/.test(value.trim())
}

/**
 * Their website as it should be saved, or empty if it cannot be one.
 *
 * "www.rajsweets.co.uk" and "rajsweets.co.uk" are how people write a website down, and they are
 * given the https:// they were missing. Anything with another scheme — http:, javascript: — is
 * not guessed at.
 */
export function sponsorLinkOf(value: string): string {
  const typed = value.trim()
  if (isSponsorLink(typed)) return typed
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(typed)) return `https://${typed}`
  return ''
}

/** A logo this site serves, or one over https. Never anything a `src` could be made to mean. */
export function isLogoAddress(value: string): boolean {
  const src = value.trim()
  return (src.startsWith('/') && !src.startsWith('//')) || /^https:\/\/\S+$/.test(src)
}

export const blankSponsor = (): Sponsor => ({
  id: '',
  name: '',
  logo: '',
  href: '',
  blurb: '',
  level: '',
  festivalIds: [],
  shown: true,
  person: false,
  agreed: false,
})

/**
 * The list as it should be saved: a row with no name is not a row, and nothing that ends up in
 * an `href` or a `src` is kept unless it is a web address. In the order the committee gave.
 */
export function tidySponsors(rows: readonly Partial<Sponsor>[]): Sponsor[] {
  const taken = new Set<string>()
  const tidy: Sponsor[] = []
  for (const row of rows) {
    const name = str(row.name)
    if (!name) continue
    let id = /^[a-z0-9][a-z0-9-]*$/.test(str(row.id)) ? str(row.id) : slugFrom(name) || 'sponsor'
    for (let n = 2; taken.has(id); n += 1) id = `${slugFrom(name) || 'sponsor'}-${n}`
    taken.add(id)
    const level = (SPONSOR_LEVELS as readonly unknown[]).includes(row.level) ? (row.level as SponsorLevel) : ''
    const festivalIds = Array.isArray(row.festivalIds)
      ? row.festivalIds.map(str).filter((f, i, all) => f && all.indexOf(f) === i)
      : []
    tidy.push({
      id,
      name: name.slice(0, SPONSOR_NAME_MAX).trim(),
      logo: isLogoAddress(str(row.logo)) ? str(row.logo) : '',
      href: sponsorLinkOf(str(row.href)),
      blurb: str(row.blurb).slice(0, SPONSOR_BLURB_MAX).trim(),
      level,
      festivalIds,
      shown: row.shown !== false,
      person: row.person === true,
      agreed: row.person === true && row.agreed === true,
    })
  }
  return tidy
}

/** Whatever the database handed back, kept only where it is fit to draw. Null if it was not a list. */
export function readSponsors(value: unknown): Sponsor[] | null {
  if (!Array.isArray(value)) return null
  return tidySponsors(
    value.filter((row): row is Partial<Sponsor> => !!row && typeof row === 'object' && !Array.isArray(row)),
  )
}

/** Whether the public site may draw this one: switched on, and named with their agreement. */
export function isOnShow(sponsor: Sponsor): boolean {
  return sponsor.shown && (!sponsor.person || sponsor.agreed)
}

/** The ones the public site draws, in the order given. */
export function sponsorsOnShow(sponsors: readonly Sponsor[]): Sponsor[] {
  return sponsors.filter(isOnShow)
}

/** Why the committee's screen says a sponsor is not on the site, or null if it is. */
export function whyNotShown(sponsor: Sponsor): string | null {
  if (!sponsor.shown) return 'Hidden'
  if (sponsor.person && !sponsor.agreed) return 'Waiting for their agreement'
  return null
}

export type SponsorGroup = { level: SponsorLevel | ''; sponsors: Sponsor[] }

/**
 * The ones on show, gold first, then silver, then friends, then those with no level — each group
 * in the committee's order. Empty groups are left out.
 */
export function groupByLevel(sponsors: readonly Sponsor[]): SponsorGroup[] {
  const shown = sponsorsOnShow(sponsors)
  return ([...SPONSOR_LEVELS, ''] as const)
    .map((level) => ({ level, sponsors: shown.filter((s) => s.level === level) }))
    .filter((group) => group.sponsors.length > 0)
}

/** Who on show helps put on this festival, in the committee's order. */
export function sponsorsOf(festivalId: string | undefined, sponsors: readonly Sponsor[]): Sponsor[] {
  if (!festivalId) return []
  return sponsorsOnShow(sponsors).filter((s) => s.festivalIds.includes(festivalId))
}

/** "A", "A and B", "A, B and C" — the names as a sentence says them. */
export function namesInASentence(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** "Sponsored by" for one, "Co-sponsored by" for two or more. */
export function sponsoredByLead(count: number): string {
  return count > 1 ? 'Co-sponsored by' : 'Sponsored by'
}

/**
 * "3 on the site · 1 hidden · 1 waiting for agreement", leaving out whatever is nought — for the
 * committee's screen. While the switch is off nobody is on the site, so it says how many are ready.
 */
export function sponsorSummary(sponsors: readonly Sponsor[], switchedOn: boolean): string {
  const on = sponsors.filter((s) => !whyNotShown(s)).length
  const hidden = sponsors.filter((s) => whyNotShown(s) === 'Hidden').length
  const waiting = sponsors.length - on - hidden
  return [
    switchedOn ? (on > 0 ? `${on} on the site` : 'None on the site') : `${on} ready`,
    hidden > 0 ? `${hidden} hidden` : '',
    waiting > 0 ? `${waiting} waiting for agreement` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
