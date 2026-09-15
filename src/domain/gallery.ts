export type Visibility = 'public' | 'members'

export type Album = {
  id: string
  slug: string
  title: string
  /** One line on where and when. */
  description?: string
  eventId?: string
  /** The festival this album is from, so a year with no date yet can still offer last year's. */
  festivalId?: string
  /**
   * A photograph pinned as the album's face, when the committee wants a particular one.
   *
   * Absent on purpose for most albums: the gallery then rotates the cover per fetch, so one
   * picture is not the whole of an evening every time somebody visits. That rotation is a
   * deliberate choice and it stays the default. Pinning is for the album where it matters —
   * the one with the photograph that actually says what the night was.
   */
  coverMediaId?: string
  /** ISO 8601 timestamp */
  publishedAt: string
  visibility: Visibility
}

/** An album with its approved media and the cover to show in lists. */
export type AlbumWithMedia = Album & { media: Media[]; cover?: Media }

export type Media = {
  id: string
  albumId: string
  type: 'photo' | 'video'
  url: string
  thumbnailUrl: string
  caption?: string
  approved: boolean
  /**
   * Where it sits in the album. Lower first; ties fall back to the key, which carries the
   * order the files were prepared in (`<album>-01`, `-02`).
   *
   * Explicit rather than taken from the filename, because reordering a page by renaming
   * objects in a bucket is not a thing to ask of anybody.
   */
  position?: number
}

/** What a person edits about an album. */
export type AlbumDraft = {
  title: string
  description?: string
  eventId?: string
  festivalId?: string
  visibility: Visibility
}

/** Album order: by position where one is set, then by key, which holds the prepared order. */
export function inOrder(media: Media[]): Media[] {
  return [...media].sort(
    (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.url.localeCompare(b.url),
  )
}

/**
 * The photograph pinned as an album's face, if there is one.
 *
 * Returns nothing when none is pinned, rather than guessing at the first: the caller then
 * rotates, which is what the gallery has always done and what most albums should keep doing.
 */
export function pinnedCover(album: Pick<Album, 'coverMediaId'>, media: Media[]): Media | undefined {
  if (!album.coverMediaId) return undefined
  return media.find((m) => m.id === album.coverMediaId)
}

/** A title people can be asked to type to confirm, and a filename they can find again. */
export function describeMedia(media: Pick<Media, 'caption' | 'url'>): string {
  return media.caption?.trim() || media.url.split('/').pop() || 'this photograph'
}
