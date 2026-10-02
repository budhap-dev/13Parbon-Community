import { formatDateWithYear, formatLongDate } from '@/domain/dates'
import type { ContactMessage } from '@/domain/contact'
import type { Event } from '@/domain/event'
import { attributionOf, type Feedback } from '@/domain/feedback'
import type { Album } from '@/domain/gallery'
import { householdText, type Household } from '@/domain/household'
import type { Announcement, NewsPost } from '@/domain/news'
import { stateOf, type Poll } from '@/domain/polls'
import type { Quiz } from '@/domain/quizzes'
import { folded, matchesEvery, searchWords } from '@/domain/search'
import { SETTING_LABELS, SITE_TEXT_FIELDS, SITE_TEXT_KEYS, type SiteSettings } from '@/domain/settings'
import { SITE_SECTIONS, sectionHref, type SectionKey } from '../siteSections'

export type SearchKind =
  | 'screen'
  | 'household'
  | 'event'
  | 'post'
  | 'notice'
  | 'album'
  | 'message'
  | 'feedback'
  | 'poll'
  | 'quiz'
  | 'setting'

export type SearchItem = {
  kind: SearchKind
  /** Unique across the whole index: the list's key, and the id of its option. */
  key: string
  title: string
  /** One line saying which one it is, so two "Mahalaya programme"s can be told apart. */
  detail: string
  /** Where choosing it goes, already pointed at the thing itself rather than at its screen. */
  to: string
  /** Everything it can be found by, folded once when the index is built. */
  text: string
}

/** The order the groups come in, which is roughly how often each is the thing being looked for. */
export const SEARCH_GROUPS: { kind: SearchKind; label: string }[] = [
  { kind: 'screen', label: 'Screens' },
  { kind: 'household', label: 'Households' },
  { kind: 'event', label: 'Evenings' },
  { kind: 'post', label: 'Writing' },
  { kind: 'notice', label: 'Noticeboard' },
  { kind: 'album', label: 'Photo albums' },
  { kind: 'message', label: 'Messages' },
  { kind: 'feedback', label: 'Feedback' },
  { kind: 'poll', label: 'Polls' },
  { kind: 'quiz', label: 'Quizzes' },
  { kind: 'setting', label: 'On the public pages' },
]

export type SearchSources = {
  screens: readonly { label: string; to: string }[]
  /** Each is absent until its list has loaded, and the index simply goes without it till then. */
  households?: readonly Household[]
  events?: readonly Event[]
  posts?: readonly NewsPost[]
  notices?: readonly Announcement[]
  albums?: readonly (Album & { media?: readonly unknown[] })[]
  messages?: readonly ContactMessage[]
  feedback?: readonly Feedback[]
  polls?: readonly Poll[]
  quizzes?: readonly Quiz[]
  settings: SiteSettings
  now: Date
}

const EVENT_STATUS: Partial<Record<Event['status'], string>> = { draft: 'Draft', cancelled: 'Cancelled', past: 'Archived' }
const FEEDBACK_STATUS: Record<Feedback['status'], string> = { pending: 'Waiting', approved: 'On the website', rejected: 'Turned down' }
const PLAY_STATE = { draft: 'Draft', scheduled: 'Scheduled', open: 'Open', closed: 'Closed' } as const

const line = (...parts: (string | undefined | null | false)[]) => parts.filter(Boolean).join(' · ')
const words = (...parts: (string | undefined | null)[]) => folded(parts.filter(Boolean).join('\n'))

/** A long message as a title: its first words, cut at a space. */
function opening(text: string, max = 70): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : max)}…`
}

/**
 * Everything the committee's search can find, as one flat list.
 *
 * Built from what the portal has already loaded through its usual hooks, under the committee's
 * own token — so it can only ever find what the database would hand that person anyway, and in
 * the walkthrough it finds the walkthrough's made-up households and nothing real.
 */
export function buildSearchIndex(sources: SearchSources): SearchItem[] {
  const { settings, now } = sources
  const items: SearchItem[] = []
  const festivalName = new Map(settings.festivals.map((festival) => [festival.id, festival.name]))

  for (const screen of sources.screens) {
    items.push({ kind: 'screen', key: `screen:${screen.to}`, title: screen.label, detail: 'Go to the screen', to: screen.to, text: words(screen.label) })
  }

  for (const household of sources.households ?? []) {
    items.push({
      kind: 'household',
      key: `household:${household.id}`,
      title: household.name,
      detail: line(household.contactName, household.email ?? household.phone),
      to: `/admin/people?open=${household.id}`,
      text: householdText(household),
    })
  }

  for (const event of sources.events ?? []) {
    const festival = event.festivalId ? festivalName.get(event.festivalId) : undefined
    items.push({
      kind: 'event',
      key: `event:${event.id}`,
      title: event.title,
      detail: line(formatDateWithYear(event.startsAt), event.venue, EVENT_STATUS[event.status]),
      to: `/admin/events?open=${event.id}`,
      text: words(event.title, event.summary, event.venue, event.venueAddress, festival, event.theme?.bengali, event.theme?.english),
    })
  }

  for (const post of sources.posts ?? []) {
    const state = !post.publishedAt ? 'Draft' : post.hidden ? 'Taken down' : formatDateWithYear(post.publishedAt)
    items.push({
      kind: 'post',
      key: `post:${post.id}`,
      title: post.title,
      detail: line(state, post.author),
      to: `/admin/content?tab=writing&open=${post.id}`,
      text: words(post.title, post.excerpt, post.body, post.author, ...post.tags),
    })
  }

  for (const notice of sources.notices ?? []) {
    items.push({
      kind: 'notice',
      key: `notice:${notice.id}`,
      title: notice.title,
      detail: notice.audience === 'public' ? 'For anybody' : 'For members',
      to: `/admin/content?tab=notices&open=${notice.id}`,
      text: words(notice.title, notice.body),
    })
  }

  for (const album of sources.albums ?? []) {
    const count = album.media?.length
    items.push({
      kind: 'album',
      key: `album:${album.id}`,
      title: album.title,
      detail: line(count === undefined ? undefined : `${count} ${count === 1 ? 'photograph' : 'photographs'}`, album.description),
      to: `/admin/media?open=${album.id}`,
      text: words(album.title, album.description, album.festivalId ? festivalName.get(album.festivalId) : undefined),
    })
  }

  for (const message of sources.messages ?? []) {
    items.push({
      kind: 'message',
      key: `message:${message.id}`,
      title: `${message.kind === 'photo' ? '📷 ' : ''}${message.subject}`,
      detail: line(message.name, formatLongDate(message.createdAt), message.handledBy ? 'Handled' : 'Unread'),
      to: `/admin/messages?open=${message.id}`,
      text: words(message.subject, message.name, message.email, message.message),
    })
  }

  for (const item of sources.feedback ?? []) {
    items.push({
      kind: 'feedback',
      key: `feedback:${item.id}`,
      title: opening(item.message),
      detail: line(attributionOf(item), FEEDBACK_STATUS[item.status]),
      to: `/admin/feedback?open=${item.id}`,
      text: words(item.message, item.authorName),
    })
  }

  for (const poll of sources.polls ?? []) {
    items.push({
      kind: 'poll',
      key: `poll:${poll.id}`,
      title: poll.title,
      detail: PLAY_STATE[stateOf(poll, now)],
      to: `/admin/play?tab=polls&open=${poll.id}`,
      text: words(poll.title, poll.detail, ...poll.options),
    })
  }

  for (const quiz of sources.quizzes ?? []) {
    items.push({
      kind: 'quiz',
      key: `quiz:${quiz.id}`,
      title: quiz.title,
      detail: line(quiz.audience === 'public' ? 'For everyone' : 'For members', PLAY_STATE[stateOf(quiz, now)]),
      to: `/admin/play?tab=quizzes&open=${quiz.id}`,
      text: words(quiz.title, quiz.intro),
    })
  }

  items.push(...settingItems(settings))
  return items
}

/**
 * The sections under Content → The pages, and what is in them.
 *
 * Each festival, committee member, question and so on is its own result, opening the section
 * that holds it — so "Holi" finds *The year's festivals*, which is the question somebody who
 * types it is really asking. The words on the pages are found by what they say as well as by
 * the name of their box, because "where does it say that?" is usually asked with the sentence
 * in hand, not the name of the box it is in.
 */
function settingItems(settings: SiteSettings): SearchItem[] {
  const items: SearchItem[] = []
  const add = (section: SectionKey, title: string, i: number | string, ...extra: (string | undefined)[]) => {
    if (!title.trim()) return
    items.push({
      kind: 'setting',
      key: `setting:${section}:${i}`,
      title,
      detail: SITE_SECTIONS[section],
      to: sectionHref(section),
      text: words(title, ...extra),
    })
  }

  for (const [section, label] of Object.entries(SITE_SECTIONS) as [SectionKey, string][]) {
    items.push({ kind: 'setting', key: `setting:${section}`, title: label, detail: 'Content → The pages', to: sectionHref(section), text: words(label) })
  }
  for (const [key, { label }] of Object.entries(SETTING_LABELS)) add('switches', label, key)
  for (const key of SITE_TEXT_KEYS) add('words', SITE_TEXT_FIELDS[key].label, key, settings.text[key])
  settings.social.forEach((channel, i) => add('social', channel.name, i, channel.blurb))
  settings.festivals.forEach((festival, i) => add('festivals', festival.name, i, festival.bengaliName, festival.season))
  settings.values.forEach((value, i) => add('values', value.title, i, value.text))
  settings.committee.forEach((person, i) => add('committee', person.name ? `${person.name}, ${person.role}` : person.role, i))
  settings.members.forEach((name, i) => add('roll', name, i))
  settings.faq.forEach((entry, i) => add('faq', entry.question, i, entry.answer))
  settings.privacy.sections.forEach((section, i) => add('privacy', section.title, i))
  settings.tools.forEach((tool, i) => add('tools', tool.name, i, tool.description))
  return items
}

export type SearchGroup = { kind: SearchKind; label: string; items: SearchItem[]; more: number }

/**
 * What answers the search, a few of each kind.
 *
 * Every word has to match somewhere, as on People. Within a kind, a title that begins with what
 * was typed comes first, then a title that contains it, then a match somewhere in the body — a
 * search for "holi" wants the evening called Holi before the piece that mentions it in passing.
 *
 * Nothing typed is a list of the screens: a way to jump about without the mouse.
 */
export function searchIndex(index: readonly SearchItem[], query: string, perGroup = 5): SearchGroup[] {
  const wanted = searchWords(query)
  const whole = wanted.join(' ')
  const scored =
    wanted.length === 0
      ? index.filter((item) => item.kind === 'screen').map((item) => ({ item, score: 0 }))
      : index
          .filter((item) => matchesEvery(wanted, item.text))
          .map((item) => {
            const title = folded(item.title)
            return { item, score: title.startsWith(whole) ? 2 : matchesEvery(wanted, title) ? 1 : 0 }
          })

  return SEARCH_GROUPS.map(({ kind, label }) => {
    const all = scored
      .filter((entry) => entry.item.kind === kind)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item)
    const limit = wanted.length === 0 ? all.length : perGroup
    return { kind, label, items: all.slice(0, limit), more: Math.max(0, all.length - limit) }
  }).filter((group) => group.items.length > 0)
}
