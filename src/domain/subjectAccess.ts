import type { ContactMessage } from './contact'
import type { Household } from './household'

/**
 * Everything the app holds about one household, gathered in one place so it can be handed to
 * them when they ask — and so the committee can keep it before erasing anybody.
 *
 * Two different jobs are often bundled together under "export" and they are not the same. This
 * is the one that answers a household asking *what do you hold about us*: it errs towards
 * completeness, and it goes to the household. A working export for the committee — the caterer's
 * list, the spreadsheet — wants the opposite, and carries no notes, no children's names and no
 * sign-in addresses, because that file gets emailed about.
 */
export type HouseholdExport = {
  /** ISO 8601 timestamp this was put together. */
  takenAt: string
  household: Household
  /**
   * Messages sent through the contact form from an address we can tie to this household.
   *
   * Matched on the address, because `contact_messages` holds no household: somebody who wrote
   * in from a work address will not be found, and the export says so rather than implying
   * there were none.
   */
  messages: ContactMessage[]
  /** Times an address of theirs tried to sign in before the committee had recorded it. */
  signInAttempts: { email: string; lastTriedAt: string; attempts: number }[]
  /**
   * Changes recorded against this household.
   *
   * Deliberately without the name of whoever made each change. The household is entitled to
   * know its membership was marked lapsed; which committee member did it is a fact about that
   * person, not about them.
   */
  changes: { action: string; at: string; fields: string[] }[]
  /**
   * How the household voted in polls.
   *
   * Only what the person taking the export can read. A household taking its own sees every
   * vote it cast; the committee sees votes only on a poll that said it was named, because on
   * any other poll nobody else can — and an export is not a way round that. VOTES_NOTE says so.
   */
  votes: { poll: string; choice: string; votedAt: string }[]
  /** Quizzes the household played, with its score and whether it chose to be on the leaderboard. */
  quizScores: { quiz: string; score: number; total: number; shownOnLeaderboard: boolean; playedAt: string }[]
  /** Quiz questions and polls the household suggested, and what became of them. */
  suggestions: { kind: 'question' | 'poll'; prompt: string; status: 'pending' | 'approved' | 'rejected'; sentAt: string }[]
  /**
   * Said out loud rather than left as silence. The privacy page promises to take down any
   * photograph somebody appears in — but nothing records who is in which picture, so no export
   * can answer "which ones am I in?". An export that simply omitted photographs would read as
   * "there are none of you".
   */
  notes: string[]
}

export const PHOTOGRAPH_NOTE =
  'Photographs are not listed here. We publish pictures from our events and we hold no record of who appears in which one, so we cannot tell you which show you. We will still take down any photograph you are in, on request and without a reason.'

export const ATTENDANCE_NOTE =
  'We do not record which events you came to. Registration is handled through our booking form, and we keep only how many people came to each event — a number with nobody named in it.'

export const CONTACT_NOTE =
  'Messages are matched to you by email address. Anything sent from an address we do not have for you will not appear above.'

export const VOTES_NOTE =
  'Votes are listed in full only when you take this copy yourself. On a poll that was not marked as named, nobody else — the committee included — can see how your household voted, so a copy the committee takes for you shows only your votes on named polls.'

/** A filename somebody can find again on their own computer. */
export function exportFilename(household: Pick<Household, 'name'>, takenAt: string): string {
  const name = household.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `13parbon-${name || 'household'}-${takenAt.slice(0, 10)}.json`
}
