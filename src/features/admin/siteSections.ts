/**
 * The sections of Site settings and of Home and About pages, by the names the screens give them.
 *
 * Here rather than written into the screen so that the portal's search offers each one under
 * the same words somebody sees on the button it opens.
 */
export const SITE_SECTIONS = {
  switches: 'What the public site shows',
  look: 'The colours a visitor arrives to',
  words: 'The words on the public pages',
  social: 'Ways to reach us, and to help',
  home: 'The home page: its order, and who sees each part',
  festivals: 'The year’s festivals',
  story: 'Our story',
  values: 'What we stand for',
  committee: 'The committee',
  roll: 'The members’ roll',
  faq: 'Questions people ask',
  collage: 'This year’s theme, in photographs',
  privacy: 'The privacy notice',
  tools: 'Other tools the committee runs',
} as const

export type SectionKey = keyof typeof SITE_SECTIONS

export const isSectionKey = (value: string): value is SectionKey => Object.hasOwn(SITE_SECTIONS, value)

/**
 * Which screen each section is on. Site settings is what is true of the whole site — what is on,
 * its colours, its single lines, how to reach us, the small print. Home and About pages is the
 * content those two pages are built from, which is what somebody is usually there to change.
 */
export type SitePart = 'site' | 'pages'
export const PAGE_SECTIONS: readonly SectionKey[] = ['home', 'festivals', 'story', 'values', 'committee', 'roll', 'faq', 'collage']
export const partOf = (key: SectionKey): SitePart => (PAGE_SECTIONS.includes(key) ? 'pages' : 'site')
export const PART_PATHS: Record<SitePart, string> = { site: '/admin/content', pages: '/admin/pages' }

/** The address that opens one section and brings it into view. */
export const sectionHref = (key: SectionKey) => `${PART_PATHS[partOf(key)]}?section=${key}`
