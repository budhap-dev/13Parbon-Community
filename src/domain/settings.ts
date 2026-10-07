import type { Festival } from './festival'
import {
  isSiteTheme,
  readCollage,
  readFestivals,
  readPrivacy,
  readSocial,
  readStory,
  readTools,
  readValues,
  webAddressOr,
  type PrivacyNotice,
  type SiteTheme,
  type SocialChannel,
  type StoryBlock,
  type ThemeCollage,
  type Tool,
  type ValueCard,
} from './siteContent'

/**
 * Who a section of the home page is for.
 *
 * Its own type rather than the one announcements use: a notice is for the public or for
 * members, and there is no such thing as an announcement only the committee can read. A home
 * page section can be committee-only while something is being got ready.
 */
export type SectionAudience = 'public' | 'members' | 'admins'

/** The sections of the home page whose audience the committee can change. */
export const HOME_SECTIONS = ['notices', 'nextEvent', 'upcoming', 'volunteer', 'yearStrip', 'photos', 'feedback'] as const
export type HomeSection = (typeof HOME_SECTIONS)[number]

/**
 * Everything on the home page that can be moved, in the order the code would put it.
 *
 * One more than the sections with an audience: "Who we are" is for everybody and always was,
 * so it has no audience to set, but it sits in the middle of the page and has to be in the
 * list for anything to be moved past it. The wordmark at the top and the invitation at the
 * bottom are not here — a page that opens on the volunteering call is not a rearrangement
 * anybody meant.
 */
export const HOME_BLOCKS = [
  'notices',
  'nextEvent',
  'whoWeAre',
  'photos',
  'yearStrip',
  'upcoming',
  'volunteer',
  'feedback',
] as const satisfies readonly (HomeSection | 'whoWeAre')[]
export type HomeBlock = (typeof HOME_BLOCKS)[number]

/** A saved order with the strangers taken out and anything it never mentioned put back. */
export function tidyHomeOrder(order: readonly unknown[]): HomeBlock[] {
  const known = order.filter((block): block is HomeBlock => (HOME_BLOCKS as readonly unknown[]).includes(block))
  const once = known.filter((block, i) => known.indexOf(block) === i)
  // A block added to the code after the order was saved still has to be drawn somewhere.
  return [...once, ...HOME_BLOCKS.filter((block) => !once.includes(block))]
}

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
 * Only flat strings here. The lists — the committee, the roll, the questions people ask, the
 * story, the festivals — are their own fields below, each with its own editor.
 */
export const SITE_TEXT_KEYS = [
  'heroLead',
  'heroName',
  'tagline',
  'mission',
  'missionStatement',
  'volunteerTitle',
  'joinTitle',
  'joinText',
  'town',
  'venue',
  'address',
  'email',
  'galleryNote',
] as const

export type SiteTextKey = (typeof SITE_TEXT_KEYS)[number]

export const SITE_TEXT_FIELDS: Record<
  SiteTextKey,
  {
    label: string
    note: string
    lines?: number
    /**
     * Whether the page has a hole in it without this line.
     *
     * A gallery note left empty is a decision: there is no note. A home page title left empty
     * is a heading with nothing in it, so those fall back to what the code says rather than
     * being saved as blank.
     */
    required?: boolean
  }
> = {
  heroLead: {
    label: 'Home page title, first half',
    note: 'The opening of the saying, in Bengali, before the name. Empty leaves the name on its own.',
  },
  heroName: {
    label: 'Home page title, the name',
    note: 'The name as it is written large at the top of the home page.',
    required: true,
  },
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
  volunteerTitle: {
    label: 'Heading over the call for helpers',
    note: 'On the home page, above whatever the next event asks for.',
    required: true,
  },
  joinTitle: {
    label: 'Invitation, the heading',
    note: 'The last thing on the home page, asking somebody to come along.',
    required: true,
  },
  joinText: {
    label: 'Invitation, the paragraph',
    note: 'A sentence or two under that heading.',
    lines: 3,
    required: true,
  },
  town: { label: 'Town', note: 'Beside the name at the foot of every page.', required: true },
  venue: { label: 'Where we usually meet', note: 'The hall’s name, as people would say it.' },
  address: { label: 'Address', note: 'Used on the contact page and to place the map.' },
  email: { label: 'Email', note: 'Where the contact page points, and where replies come from.' },
  galleryNote: {
    label: 'Note on the gallery',
    note: 'A line at the top while albums are still going up. Empty removes it, which is right once the back catalogue is in.',
    lines: 2,
  },
}

/** One line of the committee: what they do, and who they are. */
export type CommitteeMember = { role: string; name: string }

/** One question on the About page, and its answer. */
export type FaqEntry = { question: string; answer: string }

export type SiteSettings = {
  /** Whether the sign-in is offered in the header and footer. */
  showMemberSignIn: boolean
  /** Whether news and newsletters are in the navigation. */
  showNews: boolean
  /** Whether the next-event banner sits under the wordmark on the home page. */
  showNextEventStrip: boolean
  /** Whether the gallery is in the navigation and the photographs are on the home page. */
  showPhotos: boolean
  /**
   * Whether the public can leave feedback, and read what has been approved.
   *
   * One switch for both halves on purpose. A page that takes feedback and shows none reads as
   * a suggestion box; a page that shows feedback and takes none reads as a testimonial wall.
   * Which of the two it is depends entirely on whether the committee has approved anything
   * yet, and that is a decision they make piece by piece rather than with a switch.
   */
  showFeedback: boolean
  /**
   * Whether quizzes opened to everyone are on the public website.
   *
   * Members play quizzes in the portal whatever this says. This is only the public page, and
   * it starts off so a half-written quiz is never the first thing a visitor finds.
   */
  showQuizzes: boolean
  /** Who each home page section is for. */
  home: Record<HomeSection, SectionAudience>
  /**
   * The order the home page is drawn in, between the wordmark and the invitation.
   *
   * It was fixed in the code, which was fine until the week of an event — when the noticeboard
   * and the next evening belong at the top — and the month after one, when the photographs do.
   */
  homeOrder: HomeBlock[]
  /**
   * The colours a visitor sees before they have chosen any.
   *
   * The site has five looks for five parts of the year, and a first visit always opened in the
   * same one. Somebody who picks their own keeps it; this is only what the door is painted.
   */
  defaultTheme: SiteTheme
  /** The words the committee owns. Empty means "use what the code says". */
  text: Record<SiteTextKey, string>
  /**
   * Who is on the committee this year.
   *
   * It changes at the AGM, every year, which is exactly the sort of thing that should not need
   * a developer and a deploy. In the order the committee gave them, which is not a ranking.
   */
  committee: CommitteeMember[]
  /**
   * The questions people ask, and the answers. In the order given.
   *
   * The last of the nested lists to leave the files. It was the one most often wrong in a way
   * that mattered — a number of weeks left as [N], a step in a process that had since changed —
   * and each fix was a pull request for a sentence.
   */
  faq: FaqEntry[]
  /**
   * The members' roll: names, and nothing else.
   *
   * Nothing here says where anybody lives, how old they are or how to reach them. The About page
   * has always said this is the committee's to keep current and that a name comes out the day
   * its owner asks — which until now meant a pull request on the day somebody asked.
   */
  members: string[]
  /** Facebook, Instagram and the rest: the footer, the contact page, and "tell us on". */
  social: SocialChannel[]
  /**
   * Where an offer to help goes. Empty sends people to the contact page instead, which always
   * works.
   */
  volunteerFormUrl: string
  /** The occasions of the year: the strip on the home page and the filter on Events. */
  festivals: Festival[]
  /** The story on the About page, in the committee's own voice. */
  story: StoryBlock[]
  /** What we stand for, on the About page. */
  values: ValueCard[]
  /** The photographs behind this year's theme, on an event's page. */
  collage: ThemeCollage
  /** The privacy notice. See `PrivacyNotice.basedOn` for why this one is watched. */
  privacy: PrivacyNotice
  /** The committee's other apps, linked from the portal. */
  tools: Tool[]
}

/** The lists and blocks, which are everything that is neither a switch nor an audience. */
type ContentKey =
  | 'home'
  | 'homeOrder'
  | 'defaultTheme'
  | 'text'
  | 'committee'
  | 'faq'
  | 'members'
  | 'social'
  | 'volunteerFormUrl'
  | 'festivals'
  | 'story'
  | 'values'
  | 'collage'
  | 'privacy'
  | 'tools'

export type SettingsDraft = SiteSettings

/**
 * What each switch means, in the committee's words rather than the code's.
 *
 * Kept next to the type so a new switch cannot be added without saying what it does — a row of
 * unlabelled toggles is a good way to have somebody turn the gallery off by accident.
 */
export const SETTING_LABELS: Record<keyof Omit<SiteSettings, ContentKey>, { label: string; note: string }> = {
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
  showFeedback: {
    label: 'Feedback from the public',
    note: 'The feedback page, in the navigation. Nothing anybody sends appears anywhere until the committee has approved it. Turning this off hides the page and everything approved with it.',
  },
  showQuizzes: {
    label: 'Quizzes on the public website',
    note: 'The Quizzes page, in the navigation, carrying any quiz the committee has opened to everyone. Members play every quiz in the portal whatever this says.',
  },
  showMemberSignIn: {
    label: 'Member sign-in',
    note: 'The sign-in link in the header and footer. The portal still works for anybody who knows the address.',
  },
}

export const HOME_SECTION_LABELS: Record<HomeBlock, string> = {
  notices: 'The noticeboard',
  nextEvent: 'The next event',
  whoWeAre: 'Who we are',
  upcoming: 'What is coming up',
  volunteer: 'Helping out',
  yearStrip: 'Our year',
  photos: 'Photographs',
  feedback: 'What people say',
}

/** Nothing here can be wrong in a way a form allows, but a bad saved value should not get through. */
export function validateSettings(draft: SettingsDraft): boolean {
  const audiences: SectionAudience[] = ['public', 'members', 'admins']
  if (!HOME_SECTIONS.every((section) => audiences.includes(draft.home[section]))) return false
  if (!SITE_TEXT_KEYS.every((key) => typeof draft.text[key] === 'string')) return false
  // A row with a name and no role, or the other way about, is half-typed rather than wrong —
  // it is dropped on save. A row with neither was never a row. The same goes for a question
  // with no answer.
  if (!Array.isArray(draft.committee) || !Array.isArray(draft.members) || !Array.isArray(draft.faq)) return false
  // The same for the rest: what is in each list is tidied on the way out of the database, so
  // all that is asked here is that a list is a list. A save that sent a string where the
  // festivals go would otherwise replace four festivals with none.
  const lists = [draft.homeOrder, draft.social, draft.festivals, draft.story, draft.values, draft.tools]
  if (!lists.every(Array.isArray)) return false
  if (!isSiteTheme(draft.defaultTheme) || typeof draft.volunteerFormUrl !== 'string') return false
  if (!draft.collage || !Array.isArray(draft.collage.photos)) return false
  return Boolean(draft.privacy) && Array.isArray(draft.privacy.sections) && draft.privacy.sections.length > 0
}

/** The committee as it should be saved: complete rows only, in the order they were given. */
export function tidyCommittee(rows: CommitteeMember[]): CommitteeMember[] {
  return rows
    .map((row) => ({ role: row.role.trim(), name: row.name.trim() }))
    .filter((row) => row.role && row.name)
}

/** The questions as they should be saved: complete pairs only, in the order they were given. */
export function tidyFaq(rows: FaqEntry[]): FaqEntry[] {
  return rows
    .map((row) => ({ question: row.question.trim(), answer: row.answer.trim() }))
    .filter((row) => row.question && row.answer)
}

/**
 * The roll, from a box with one name to a line.
 *
 * A textarea rather than thirty-one boxes: the list is pasted from somewhere else as often as
 * it is typed, and thirty-one inputs is a form nobody finishes.
 */
export function rollFromText(text: string): string[] {
  return text
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean)
}

export function rollToText(names: string[]): string {
  return names.join('\n')
}

/**
 * Saved settings laid over what the code says, key by key.
 *
 * The row is one JSON object, which is the shape this file warns about: a column anybody can
 * put anything in. What keeps it honest is that nothing is trusted on the way out. A key that
 * is missing, the wrong type, or no longer part of `SiteSettings` falls back to the default
 * rather than reaching a page — so a switch renamed in the code cannot leave a stale value
 * quietly driving the live site, and a half-written row cannot blank the home page.
 */
export function mergeSettings(stored: unknown, defaults: SiteSettings): SiteSettings {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaults
  const row = stored as Partial<Record<keyof SiteSettings, unknown>>

  const bool = (key: keyof SiteSettings) =>
    typeof row[key] === 'boolean' ? (row[key] as boolean) : (defaults[key] as boolean)

  const home = { ...defaults.home }
  const storedHome = row.home
  if (storedHome && typeof storedHome === 'object') {
    for (const section of HOME_SECTIONS) {
      const value = (storedHome as Record<string, unknown>)[section]
      if (value === 'public' || value === 'members' || value === 'admins') home[section] = value
    }
  }

  const text = { ...defaults.text }
  const storedText = row.text
  if (storedText && typeof storedText === 'object') {
    for (const key of SITE_TEXT_KEYS) {
      const value = (storedText as Record<string, unknown>)[key]
      // Blank is an answer for most of these — no gallery note, no mission statement yet — but
      // not for the ones a page has a hole without.
      if (typeof value === 'string' && (value.trim() || !SITE_TEXT_FIELDS[key].required)) text[key] = value
    }
  }

  const committee = Array.isArray(row.committee)
    ? tidyCommittee(
        (row.committee as unknown[]).filter(
          (entry): entry is CommitteeMember =>
            !!entry &&
            typeof entry === 'object' &&
            typeof (entry as CommitteeMember).role === 'string' &&
            typeof (entry as CommitteeMember).name === 'string',
        ),
      )
    : defaults.committee

  const faq = Array.isArray(row.faq)
    ? tidyFaq(
        (row.faq as unknown[]).filter(
          (entry): entry is FaqEntry =>
            !!entry &&
            typeof entry === 'object' &&
            typeof (entry as FaqEntry).question === 'string' &&
            typeof (entry as FaqEntry).answer === 'string',
        ),
      )
    : defaults.faq

  const members = Array.isArray(row.members)
    ? (row.members as unknown[]).filter((name): name is string => typeof name === 'string')
    : defaults.members

  return {
    showFeedback: bool('showFeedback'),
    showMemberSignIn: bool('showMemberSignIn'),
    showNews: bool('showNews'),
    showNextEventStrip: bool('showNextEventStrip'),
    showPhotos: bool('showPhotos'),
    showQuizzes: bool('showQuizzes'),
    home,
    homeOrder: Array.isArray(row.homeOrder) ? tidyHomeOrder(row.homeOrder) : defaults.homeOrder,
    defaultTheme: isSiteTheme(row.defaultTheme) ? row.defaultTheme : defaults.defaultTheme,
    text,
    committee,
    faq,
    members,
    // Each of these keeps only what is fit to draw. An empty list that was saved is an answer —
    // no festivals this year, no channels — and is not the same as nothing having been saved.
    social: readSocial(row.social) ?? defaults.social,
    volunteerFormUrl: typeof row.volunteerFormUrl === 'string' ? webAddressOr(row.volunteerFormUrl) : defaults.volunteerFormUrl,
    festivals: readFestivals(row.festivals) ?? defaults.festivals,
    story: readStory(row.story) ?? defaults.story,
    values: readValues(row.values) ?? defaults.values,
    collage: readCollage(row.collage, defaults.collage),
    privacy: readPrivacy(row.privacy, defaults.privacy),
    tools: readTools(row.tools) ?? defaults.tools,
  }
}
