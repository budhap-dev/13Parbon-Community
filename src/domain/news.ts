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
  /** ISO 8601 timestamp */
  publishedAt: string
  author: string
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
