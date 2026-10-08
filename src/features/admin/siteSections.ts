/**
 * The sections under Content → The pages, by the names the screen gives them.
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

/** The address that opens one section and brings it into view. */
export const sectionHref = (key: SectionKey) => `/admin/content?section=${key}`
