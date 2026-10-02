import type { Event } from '@/domain/event'

/**
 * What the event designer and its full-page preview say to each other.
 *
 * The preview is the real public page in a frame of its own, so a phone-sized frame gets the
 * phone layout — the page's media queries answer to the window they are in, and a frame is one.
 * The draft goes across as a message rather than through the address or storage: it is never
 * saved anywhere, and nothing but this same site is listened to.
 */
export const PREVIEW_PATH = '/preview/event'

const SOURCE = '13parbon-event-preview'

export type PreviewMessage =
  /** The frame has loaded and is listening. */
  | { source: typeof SOURCE; type: 'ready' }
  /** The page to draw, and how many times to have played the cover so far. */
  | { source: typeof SOURCE; type: 'show'; event: Event; replay: number }
  /** Escape was pressed inside the frame, where the designer cannot hear it. */
  | { source: typeof SOURCE; type: 'close' }

type WithoutSource<T> = T extends unknown ? Omit<T, 'source'> : never

export function previewMessage(message: WithoutSource<PreviewMessage>): PreviewMessage {
  return { source: SOURCE, ...message } as PreviewMessage
}

/** A message from this site's own preview, or nothing. */
export function readPreviewMessage(event: MessageEvent): PreviewMessage | null {
  if (event.origin !== window.location.origin) return null
  const data = event.data as Partial<PreviewMessage> | null
  return data && typeof data === 'object' && data.source === SOURCE ? (data as PreviewMessage) : null
}
