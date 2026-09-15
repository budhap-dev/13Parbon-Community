/**
 * Who a section of the home page is for.
 *
 * Its own type rather than the one announcements use: a notice is for the public or for
 * members, and there is no such thing as an announcement only the committee can read. A home
 * page section can be committee-only while something is being got ready.
 */
export type SectionAudience = 'public' | 'members' | 'admins'

/** The sections of the home page whose audience the committee can change. */
export const HOME_SECTIONS = ['nextEvent', 'upcoming', 'volunteer', 'yearStrip', 'photos'] as const
export type HomeSection = (typeof HOME_SECTIONS)[number]

/**
 * The switches the committee can throw without a developer.
 *
 * These lived in `src/app/site.ts` as a typed const, which meant turning the news section on
 * was a code change, a pull request and a deploy — for a decision that is entirely the
 * committee's to make and that they may well want to reverse on the night.
 *
 * Deliberately a fixed shape rather than a bag of key–value pairs. A settings table anybody can
 * put anything in drifts: a key gets renamed in the code and the row that used to drive it sits
 * there meaning nothing, and nobody notices because nothing fails. This way a switch that is not
 * in the type does not exist.
 *
 * `site.ts` still holds the values these fall back to, so a project with nothing saved behaves
 * exactly as the code says.
 */
/**
 * The words on the public pages that belong to the committee rather than to the code.
 *
 * Only flat strings, and only the ones that actually change. The FAQ, the committee list and
 * the captions under the theme photographs are nested arrays, and an editor for those is a
 * different piece of work — they are left in the files until somebody needs to change one
 * without a developer.
 */
export const SITE_TEXT_KEYS = [
  'tagline',
  'mission',
  'missionStatement',
  'venue',
  'address',
  'email',
  'galleryNote',
] as const

export type SiteTextKey = (typeof SITE_TEXT_KEYS)[number]

export const SITE_TEXT_FIELDS: Record<SiteTextKey, { label: string; note: string; lines?: number }> = {
  tagline: { label: 'Tagline', note: 'The line under the name, on the home page and in link previews.' },
  mission: {
    label: 'Who we are',
    note: 'The paragraph that says what this is, for somebody who has never been.',
    lines: 4,
  },
  missionStatement: {
    label: 'Mission and vision',
    note: 'Two or three sentences from the committee. Left in [brackets] it is hidden rather than shown as a placeholder.',
    lines: 4,
  },
  venue: { label: 'Where we usually meet', note: 'The hall’s name, as people would say it.' },
  address: { label: 'Address', note: 'Used on the contact page and to place the map.' },
  email: { label: 'Email', note: 'Where the contact page points, and where replies come from.' },
  galleryNote: {
    label: 'Note on the gallery',
    note: 'A line at the top while albums are still going up. Empty removes it, which is right once the back catalogue is in.',
    lines: 2,
  },
}

export type SiteSettings = {
  /** Whether the sign-in is offered in the header and footer. */
  showMemberSignIn: boolean
  /** Whether news and newsletters are in the navigation. */
  showNews: boolean
  /** Whether the next-event banner sits under the wordmark on the home page. */
  showNextEventStrip: boolean
  /** Whether the gallery is in the navigation and the photographs are on the home page. */
  showPhotos: boolean
  /** Who each home page section is for. */
  home: Record<HomeSection, SectionAudience>
  /** The words the committee owns. Empty means "use what the code says". */
  text: Record<SiteTextKey, string>
}

export type SettingsDraft = SiteSettings

/**
 * What each switch means, in the committee's words rather than the code's.
 *
 * Kept next to the type so a new switch cannot be added without saying what it does — a row of
 * unlabelled toggles is a good way to have somebody turn the gallery off by accident.
 */
export const SETTING_LABELS: Record<keyof Omit<SiteSettings, 'home' | 'text'>, { label: string; note: string }> = {
  showPhotos: {
    label: 'Photographs',
    note: 'The gallery in the navigation, and pictures on the home page. Turning this off pulls the whole gallery at once.',
  },
  showNews: {
    label: 'News and newsletters',
    note: 'Off until there is real news to carry. A page of placeholders reads worse than no page.',
  },
  showNextEventStrip: {
    label: 'Next event banner',
    note: 'The strip pinned under the wordmark on the home page.',
  },
  showMemberSignIn: {
    label: 'Member sign-in',
    note: 'The sign-in link in the header and footer. The portal still works for anybody who knows the address.',
  },
}

export const HOME_SECTION_LABELS: Record<HomeSection, string> = {
  nextEvent: 'The next event',
  upcoming: 'What is coming up',
  volunteer: 'Helping out',
  yearStrip: 'Our year',
  photos: 'Photographs',
}

/** Nothing here can be wrong in a way a form allows, but a bad saved value should not get through. */
export function validateSettings(draft: SettingsDraft): boolean {
  const audiences: SectionAudience[] = ['public', 'members', 'admins']
  if (!HOME_SECTIONS.every((section) => audiences.includes(draft.home[section]))) return false
  return SITE_TEXT_KEYS.every((key) => typeof draft.text[key] === 'string')
}
