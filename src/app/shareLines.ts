import { formatLongDate, formatTime } from '@/domain/dates'
import { isCancelled, type Event } from '@/domain/event'
import { site } from './site'

/**
 * The line each page is passed on with: the text the share button puts above the link in a
 * WhatsApp message, and the page's description for a search engine that runs it. All of them
 * here, so the wording can be read and changed in one place.
 *
 * WhatsApp shows the text and not the title, so each line says whose it is and stands on its own.
 * A page with none — the home page — is passed on with the site's own line, from index.html.
 */
export const SHARE_LINES = {
  events: `What’s on at ${site.name} in Leeds: our coming evenings and festivals, and how to come along.`,
  gallery: `Photos from ${site.name}’s evenings and festivals in Leeds.`,
  about: `Who we are: ${site.name}, a Bengali cultural association in Leeds, and the people who run it.`,
  contact: `How to get in touch with ${site.name} in Leeds.`,
  sponsors: `The businesses and friends who help ${site.name} put its evenings on.`,
  feedback: `Tell ${site.name} what you thought of an evening, or what you would like next.`,
  play: `Vote in ${site.name}’s polls and try the quizzes.`,
  privacy: `How ${site.name} looks after your information.`,
} as const

/** An evening: what, when and where, so the message says it without the link being opened. */
export function eventShareLine(event: Event): string {
  const when = `${formatLongDate(event.startsAt)}, ${formatTime(event.startsAt)}`
  if (isCancelled(event)) return `Cancelled: ${event.title}, ${when} at ${event.venue}.`
  return `${event.title}: ${when} at ${event.venue}. ${event.summary}`.trim()
}

/** An album: its name and how many photos are in it. */
export function albumShareLine(title: string, photos: number): string {
  return `${title}: ${photos} ${photos === 1 ? 'photo' : 'photos'} from ${site.name}.`
}

/**
 * A month of the calendar, which is in the address: its name and the first three of what is on
 * in it.
 */
export function calendarShareLine(month: string, occasions: string[]): string {
  const lead = `${month} in the Bengali calendar from ${site.name}`
  const tail = 'with the times in the UK and India.'
  if (occasions.length === 0) return `${lead}, ${tail}`
  const listed =
    occasions.length > 3
      ? `${occasions.slice(0, 3).join(', ')} and more`
      : occasions.length === 1
        ? occasions[0]
        : `${occasions.slice(0, -1).join(', ')} and ${occasions.at(-1)}`
  return `${lead}: ${listed}, ${tail}`
}
