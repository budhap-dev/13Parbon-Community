import type { Festival } from './festival'
import { slugFrom } from './slug'

/**
 * The parts of the public site that are lists and blocks rather than a switch or a line.
 *
 * Everything here used to be a file a developer edited: the Facebook address, the four
 * festivals, the story on the About page, the privacy notice. Each is now a field of
 * `SiteSettings`, saved in the same row as the switches, and each has two things beside its
 * type — a reader that takes whatever the database handed back and keeps only what is fit to
 * draw, and (where a person types it) a plain-text form a committee member can paste into.
 *
 * The readers matter more than they look. The row is JSON, and some of these values end up
 * in an `href`. A link that says `javascript:` is a script that runs for whoever presses it,
 * so nothing is given to a page as an address unless it starts with `https://` or `http://`.
 */

/** A web address, and nothing cleverer. */
const WEB_ADDRESS = /^https?:\/\/\S+$/

export function isWebAddress(value: string): boolean {
  return WEB_ADDRESS.test(value.trim())
}

/** The address if it is one, and nothing at all if it is not. */
export function webAddressOr(value: unknown, otherwise = ''): string {
  return typeof value === 'string' && isWebAddress(value) ? value.trim() : otherwise
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** The rows of a stored list that are objects, as loosely typed records. */
function records(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))
}

/* ------------------------------------------------------------------ the look */

/**
 * The festival colour schemes a visitor can choose between, and the committee can choose first.
 *
 * Named here rather than beside the CSS because the saved default has to be checked against
 * this list on the way out of the database: a theme renamed in the code must fall back, not
 * stamp a name on the page that no stylesheet answers to.
 */
export const SITE_THEMES = [
  'festival',
  'poila-boishakh',
  'saraswati',
  'holi',
  'mahalaya',
  'kojagori',
  'deepavali',
  'borodin',
] as const
export type SiteTheme = (typeof SITE_THEMES)[number]

export function isSiteTheme(value: unknown): value is SiteTheme {
  return typeof value === 'string' && (SITE_THEMES as readonly string[]).includes(value)
}

/* ------------------------------------------------------------ ways to reach us */

/** The marks there is a drawing for. A channel with none of its own takes the plain link. */
export const SOCIAL_ICONS = ['facebook', 'instagram', 'whatsapp', 'youtube', 'message', 'link'] as const
export type SocialIcon = (typeof SOCIAL_ICONS)[number]

export const SOCIAL_ICON_LABELS: Record<SocialIcon, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
  message: 'A speech bubble',
  link: 'A plain link',
}

export type SocialChannel = {
  name: string
  icon: SocialIcon
  /** Where it goes. Empty means it is named but not linked — a group you have to be added to. */
  href: string
  /** A line saying what it is for. */
  blurb: string
  /** How it reads inside a sentence, where the name alone would not. Falls back to the name. */
  mention?: string
}

export function tidySocial(rows: SocialChannel[]): SocialChannel[] {
  return rows
    .map((row) => {
      const name = str(row.name)
      const mention = str(row.mention)
      return {
        name,
        icon: (SOCIAL_ICONS as readonly string[]).includes(row.icon) ? row.icon : 'link',
        href: webAddressOr(row.href),
        blurb: str(row.blurb),
        ...(mention ? { mention } : {}),
      } satisfies SocialChannel
    })
    .filter((row) => row.name)
}

export function readSocial(value: unknown): SocialChannel[] | null {
  const rows = records(value)
  return rows ? tidySocial(rows as unknown as SocialChannel[]) : null
}

/** The channels with an address, which are the only ones worth drawing as a link. */
export function linkedSocial(channels: SocialChannel[]): SocialChannel[] {
  return channels.filter((channel) => channel.href)
}

/* ------------------------------------------------------------------ festivals */

/**
 * The year's occasions as they should be saved.
 *
 * The id is what an evening is filed under and what the address bar says
 * (`/events?festival=holi`), so it is kept exactly as it was when a festival is renamed — the
 * evenings already filed under it must not come loose. A new one takes its id from its name.
 */
export function tidyFestivals(rows: Festival[]): Festival[] {
  const taken = new Set<string>()
  const tidy: Festival[] = []
  for (const row of rows) {
    const name = str(row.name)
    if (!name) continue
    const id = /^[a-z0-9][a-z0-9-]*$/.test(str(row.id)) ? str(row.id) : slugFrom(name)
    if (!id || taken.has(id)) continue
    taken.add(id)
    const bengaliName = str(row.bengaliName)
    const season = str(row.season)
    const description = str(row.description)
    tidy.push({
      id,
      name,
      ...(bengaliName ? { bengaliName } : {}),
      ...(season ? { season } : {}),
      ...(description ? { description } : {}),
    })
  }
  return tidy
}

export function readFestivals(value: unknown): Festival[] | null {
  const rows = records(value)
  return rows ? tidyFestivals(rows as unknown as Festival[]) : null
}

/* ------------------------------------------------------------------ the story */

/** A paragraph, a run of bullets, or a heading part-way down the story. */
export type StoryBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'heading'; text: string }

const BULLET = /^\s*[-*•]\s+/
const HEADING = /^\s*#+\s+/

/**
 * The story as one box of text.
 *
 * A paragraph is a paragraph, a line starting with `#` is a heading, and lines starting with
 * `-` are a list. One box rather than a row of little ones with a type picker on each: the
 * story was written somewhere else and pasted in, and it will be again.
 */
export function storyToText(blocks: readonly StoryBlock[]): string {
  return blocks
    .map((block) =>
      block.kind === 'heading'
        ? `# ${block.text}`
        : block.kind === 'list'
          ? block.items.map((item) => `- ${item}`).join('\n')
          : block.text,
    )
    .join('\n\n')
}

export function storyFromText(text: string): StoryBlock[] {
  const blocks: StoryBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'text', text: paragraph.join(' ') })
    if (list.length > 0) blocks.push({ kind: 'list', items: list })
    paragraph = []
    list = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) {
      flush()
    } else if (HEADING.test(line)) {
      flush()
      blocks.push({ kind: 'heading', text: line.replace(HEADING, '').trim() })
    } else if (BULLET.test(line)) {
      // A bullet straight after a sentence starts the list; it does not join the sentence.
      if (paragraph.length > 0) flush()
      list.push(line.replace(BULLET, '').trim())
    } else {
      if (list.length > 0) flush()
      paragraph.push(line)
    }
  }
  flush()
  return blocks.filter((block) => (block.kind === 'list' ? block.items.length > 0 : block.text))
}

export function readStory(value: unknown): StoryBlock[] | null {
  const rows = records(value)
  if (!rows) return null
  const blocks: StoryBlock[] = []
  for (const row of rows) {
    if (row.kind === 'list' && Array.isArray(row.items)) {
      const items = row.items.map(str).filter(Boolean)
      if (items.length > 0) blocks.push({ kind: 'list', items })
    } else if ((row.kind === 'text' || row.kind === 'heading') && str(row.text)) {
      blocks.push({ kind: row.kind, text: str(row.text) })
    }
  }
  return blocks
}

/* ----------------------------------------------------------- what we stand for */

/** The drawings a value can sit beside. */
export const VALUE_ICONS = ['mic', 'users', 'door', 'heart', 'sparkle', 'book', 'calendar', 'megaphone', 'home', 'badge'] as const
export type ValueIcon = (typeof VALUE_ICONS)[number]

export const VALUE_ICON_LABELS: Record<ValueIcon, string> = {
  mic: 'A microphone',
  users: 'People',
  door: 'An open door',
  heart: 'A heart',
  sparkle: 'A sparkle',
  book: 'A book',
  calendar: 'A calendar',
  megaphone: 'A megaphone',
  home: 'A house',
  badge: 'A badge',
}

export type ValueCard = { icon: ValueIcon; title: string; text: string }

export function tidyValues(rows: ValueCard[]): ValueCard[] {
  return rows
    .map((row) => ({
      icon: (VALUE_ICONS as readonly string[]).includes(row.icon) ? row.icon : ('heart' as ValueIcon),
      title: str(row.title),
      text: str(row.text),
    }))
    .filter((row) => row.title && row.text)
}

export function readValues(value: unknown): ValueCard[] | null {
  const rows = records(value)
  return rows ? tidyValues(rows as unknown as ValueCard[]) : null
}

/* ------------------------------------------------- the theme's photographs */

export type ThemePhoto = {
  /** Where it is served from: the bucket, or a file that ships with the site. */
  src: string
  /** What is in it, for somebody who cannot see it. */
  alt: string
  /** One line naming the old and the new the photograph holds. */
  caption: string
  /** Where to hold the picture as its cell crops it, as a CSS object-position. */
  focus: string
}

/**
 * The photographs behind this year's theme, with the words that go round them.
 *
 * The theme changes every year, which is the reason this left the files: the label read
 * "Calcutta then, Kolkata now" for as long as nobody opened a pull request to say otherwise.
 */
export type ThemeCollage = {
  /** What the whole collage is called, read out to somebody using a screen reader. */
  label: string
  /** Who took them. Empty leaves the credit off. */
  credit: string
  photos: ThemePhoto[]
}

const FOCUS = /^\d{1,3}% \d{1,3}%$/

/** Served by this site, or over https. Never anything else an `src` could be made to mean. */
export function isPhotoAddress(value: string): boolean {
  const src = value.trim()
  return (src.startsWith('/') && !src.startsWith('//')) || /^https:\/\/\S+$/.test(src)
}

export function tidyThemePhotos(rows: ThemePhoto[]): ThemePhoto[] {
  return rows
    .map((row) => ({
      src: str(row.src),
      alt: str(row.alt),
      caption: str(row.caption),
      focus: FOCUS.test(str(row.focus)) ? str(row.focus) : '50% 50%',
    }))
    .filter((row) => isPhotoAddress(row.src))
}

export function readCollage(value: unknown, defaults: ThemeCollage): ThemeCollage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
  const row = value as Record<string, unknown>
  const photos = records(row.photos)
  return {
    // A collage nobody can name is one a screen reader announces as nothing.
    label: str(row.label) || defaults.label,
    credit: typeof row.credit === 'string' ? row.credit.trim() : defaults.credit,
    photos: photos ? tidyThemePhotos(photos as unknown as ThemePhoto[]) : defaults.photos,
  }
}

/* ------------------------------------------------------------ the privacy notice */

export type PrivacySection = { title: string; body: string[] }

export type PrivacyNotice = {
  /** The date the notice took effect, as it is printed. Stamped when the notice is saved. */
  updatedOn: string
  controller: string
  /**
   * Which version of the developer's notice this one was edited from.
   *
   * The notice has to describe what the site actually does, and what the site does changes in
   * the code. When it does, the developer rewrites the notice in `privacy.ts` and moves its
   * date on — and a saved notice would go on being shown over the top of it, describing a site
   * that no longer exists. This is how the editor notices: the date it was based on is no
   * longer the date in the code, and it says so.
   */
  basedOn: string
  sections: PrivacySection[]
}

/** One paragraph to a line, which is how somebody types a notice into a box. */
export function paragraphsFromText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function paragraphsToText(paragraphs: readonly string[]): string {
  return paragraphs.join('\n\n')
}

export function tidyPrivacySections(rows: PrivacySection[]): PrivacySection[] {
  return rows
    .map((row) => ({
      title: str(row.title),
      body: Array.isArray(row.body) ? row.body.map(str).filter(Boolean) : [],
    }))
    .filter((row) => row.title && row.body.length > 0)
}

export function readPrivacy(value: unknown, defaults: PrivacyNotice): PrivacyNotice {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
  const row = value as Record<string, unknown>
  const rows = records(row.sections)
  const sections = rows ? tidyPrivacySections(rows as unknown as PrivacySection[]) : []
  // A privacy page with nothing on it is never what anybody meant to save.
  if (sections.length === 0) return defaults
  return {
    updatedOn: str(row.updatedOn) || defaults.updatedOn,
    controller: str(row.controller) || defaults.controller,
    basedOn: str(row.basedOn) || defaults.basedOn,
    sections,
  }
}

/* ------------------------------------------------------------------ other tools */

/** Another app the committee runs, linked from the portal so nobody has to remember the address. */
export type Tool = { name: string; description: string; href: string }

export function tidyTools(rows: Tool[]): Tool[] {
  return rows
    .map((row) => ({ name: str(row.name), description: str(row.description), href: webAddressOr(row.href) }))
    .filter((row) => row.name && row.href)
}

export function readTools(value: unknown): Tool[] | null {
  const rows = records(value)
  return rows ? tidyTools(rows as unknown as Tool[]) : null
}
