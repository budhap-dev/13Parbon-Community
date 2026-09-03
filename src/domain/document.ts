export type DocumentCategory = 'minutes' | 'guidelines' | 'resources'

export type CommunityDocument = {
  id: string
  title: string
  category: DocumentCategory
  fileUrl: string
  /** ISO 8601 date */
  addedOn: string
}

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  minutes: 'Minutes',
  guidelines: 'Guidelines',
  resources: 'Resources',
}

/** A Google account that signed in but matched no household. */
export type SignInAttempt = {
  id: string
  email: string
  /** The name Google gave, which is all we know about them. */
  name: string
  /** ISO 8601 timestamp */
  lastTriedAt: string
  attempts: number
  /** Set once the committee has added them or decided not to. */
  resolved: boolean
}
