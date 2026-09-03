export type Visibility = 'public' | 'members'

export type Album = {
  id: string
  slug: string
  title: string
  eventId?: string
  /** ISO 8601 timestamp */
  publishedAt: string
  visibility: Visibility
}

export type Media = {
  id: string
  albumId: string
  type: 'photo' | 'video'
  url: string
  thumbnailUrl: string
  caption?: string
  approved: boolean
}
