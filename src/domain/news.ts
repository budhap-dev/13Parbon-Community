export { slugFrom } from './slug'
export type Audience = 'public' | 'members'

export type Announcement = {
  id: string
  title: string
  body: string
  pinned: boolean
  audience: Audience
  /** ISO 8601 timestamp */
  publishAt: string
  /** ISO 8601 timestamp */
  expiresAt?: string
  /** Optional call to action. */
  link?: { label: string; to: string }
}

export type NewsPost = {
  id: string
  slug: string
  title: string
  /** One-paragraph summary shown in lists. */
  excerpt: string
  /** Plain paragraphs separated by blank lines. */
  body: string
  tags: string[]
  /**
   * ISO 8601 timestamp: when it first went onto the website. Absent means never — a draft.
   *
   * Kept when a piece is taken down, rather than cleared. Clearing it loses the only record of
   * when the piece belongs to, so a round-up of April that came down for a week would come
   * back dated today and sit at the top of the list as though it were new.
   */
  publishedAt?: string
  /**
   * Taken down, but still written. Unpublishing sets this instead of deleting the post, so
   * "who took that down, and when?" has an answer and the writing is there to put back.
   */
  hidden?: boolean
  author: string
}

/** What a person writes in the form. */
export type NewsDraft = {
  title: string
  excerpt: string
  body: string
  tags: string[]
  author: string
  /** Whether it should be on the website. */
  published: boolean
}

export type AnnouncementDraft = {
  title: string
  body: string
  pinned: boolean
  audience: Audience
  /** ISO 8601 timestamp. Empty means now. */
  publishAt: string
  /** ISO 8601 timestamp. Empty means it does not expire. */
  expiresAt: string
  link?: { label: string; to: string }
}

export type ContentErrors = Record<string, string>

/**
 * An announcement is short and pinned, never a feed.
 *
 * The story is firm about this: the app does not compete with WhatsApp for attention, it
 * replaces the need for it. So the form asks for something that fits on a noticeboard, and
 * refuses an essay rather than letting the noticeboard turn into one.
 */
export const ANNOUNCEMENT_MAX = 500

export function validateAnnouncement(draft: AnnouncementDraft): ContentErrors {
  const errors: ContentErrors = {}
  if (draft.title.trim().length < 3) errors.title = 'Give it a title people will read at a glance.'
  if (draft.body.trim().length < 10) errors.body = 'Say what is happening, in a sentence or two.'
  if (draft.body.trim().length > ANNOUNCEMENT_MAX) {
    errors.body = `Keep it under ${ANNOUNCEMENT_MAX} characters. Anything longer wants to be a news post.`
  }
  if (draft.publishAt && draft.expiresAt && draft.expiresAt <= draft.publishAt) {
    errors.expiresAt = 'It cannot stop being shown before it starts.'
  }
  if (draft.link && draft.link.label.trim() && !draft.link.to.trim()) {
    errors.link = 'A button needs somewhere to go.'
  }
  return errors
}

export function validateNews(draft: NewsDraft): ContentErrors {
  const errors: ContentErrors = {}
  if (draft.title.trim().length < 3) errors.title = 'Give the piece a title.'
  if (draft.excerpt.trim().length < 10) errors.excerpt = 'One line for the list page, so people know whether to open it.'
  if (draft.body.trim().length < 40) errors.body = 'There is not much here yet.'
  if (draft.author.trim().length < 2) errors.author = 'Who wrote it?'
  return errors
}

export function isValid(errors: ContentErrors): boolean {
  return Object.keys(errors).length === 0
}

/** Whether an announcement should be on the page at this moment. */
export function isLive(announcement: Announcement, at: string): boolean {
  return announcement.publishAt <= at && (!announcement.expiresAt || announcement.expiresAt > at)
}


export type Newsletter = {
  id: string
  title: string
  fileUrl: string
  /** ISO 8601 date */
  issuedOn: string
}

/** Splits a plain-text body into paragraphs on blank lines. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
