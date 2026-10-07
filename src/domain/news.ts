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

/**
 * The longest a title may be, on a notice or a piece.
 *
 * The database has said `between 1 and 200` on both tables since they were written, and nothing
 * in the app knew it: a longer title was accepted by the form, sent, and refused by a check
 * constraint — which reaches the screen as whatever Postgres called it, after the writing was
 * done. A rule enforced only at the far end is a rule the person writing meets at the worst
 * possible moment.
 */
export const TITLE_MAX = 200

/**
 * The shortest a piece and its one-line summary may be.
 *
 * They were 40 and 10, which are floors against an empty box rather than against a piece that
 * is not one: 40 characters is a single short sentence, and a notice — the thing a piece is
 * meant to be *more* than — may run to 500. So the form would refuse an essay on the
 * noticeboard and accept one sentence as an article.
 *
 * 150 is a little under the shortest real piece the site has carried (a thank-you after
 * Saraswati Puja, 159), which is about the length below which there is nothing there that a
 * notice would not have done better. A piece may still be shorter than a notice — they differ
 * in kind, not only in length — but not by a sentence.
 *
 * 30 for the line on the list page, where the real ones run to about a hundred. At 10 it
 * accepted "Hello there", which tells nobody whether to open it.
 */
export const PIECE_MIN = 30
export const EXCERPT_MIN = 30

/**
 * The longest a piece may run.
 *
 * `body` is a text column with no limit of its own, so this is a judgement rather than a
 * constraint being mirrored: about eight hundred words, which is longer than anything the
 * committee has written and long enough that a runaway paste says so before it is saved.
 */
export const PIECE_MAX = 5000

/** The shortest a title may be, and the shortest a notice may say. */
export const TITLE_MIN = 3
export const NOTICE_MIN = 10

export function validateAnnouncement(draft: AnnouncementDraft): ContentErrors {
  const errors: ContentErrors = {}
  if (draft.title.trim().length < TITLE_MIN) {
    errors.title = `Give it a title people will read at a glance, of ${TITLE_MIN} characters or more.`
  }
  if (draft.title.trim().length > TITLE_MAX) errors.title = `A title has to fit in ${TITLE_MAX} characters.`
  if (draft.body.trim().length < NOTICE_MIN) {
    errors.body = `Say what is happening, in a sentence or two — at least ${NOTICE_MIN} characters.`
  }
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
  if (draft.title.trim().length < TITLE_MIN) errors.title = `Give the piece a title, of ${TITLE_MIN} characters or more.`
  if (draft.title.trim().length > TITLE_MAX) errors.title = `A title has to fit in ${TITLE_MAX} characters.`
  if (draft.excerpt.trim().length < EXCERPT_MIN) {
    errors.excerpt = `One line for the list page, so people know whether to open it — at least ${EXCERPT_MIN} characters.`
  }
  if (draft.body.trim().length < PIECE_MIN) {
    errors.body = `There is not much here yet — a piece runs to at least ${PIECE_MIN} characters.`
  }
  if (draft.body.trim().length > PIECE_MAX) {
    errors.body = `That is longer than ${PIECE_MAX} characters, which is longer than anybody reads in one go.`
  }
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
