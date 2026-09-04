export type Festival = {
  id: string
  name: string
  /** Name in Bengali script, when known. */
  bengaliName?: string
  /** Roughly when it falls, since the dates move with the Bengali calendar. */
  season?: string
  /** What actually happens, for somebody who has never been. */
  description?: string
}
