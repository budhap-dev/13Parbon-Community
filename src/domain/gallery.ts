export type Visibility = 'public' | 'members'

export type Album = {
  id: string
  slug: string
  title: string
  /** One line on where and when. */
  description?: string
  eventId?: string
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
}
