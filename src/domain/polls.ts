/**
 * Polls: a question the committee asks, one vote per household.
 *
 * Members only, and that is a rule rather than a starting point. A poll anybody could answer
 * could be answered fifty times by one person, and a result nobody can trust settles nothing.
 * Sign-in is per household, so the household is what votes — which is also the fair unit for
 * the questions a poll is for: which Saturday, veg or non-veg.
 *
 * The rules here mirror `supabase/polls-quizzes.sql`, which is what actually enforces them.
 */

import type { ContentErrors } from './news'

/** When members get to see the totals. */
export type PollResults = 'after_vote' | 'after_close' | 'committee'

export const POLL_RESULTS: Record<PollResults, string> = {
  after_vote: 'Once they have voted',
  after_close: 'When the poll closes',
  committee: 'Never — the committee only',
}

export type Poll = {
  id: string
  title: string
  /** A line or two of background. May be empty. */
  detail: string
  options: string[]
  /**
   * Whether the committee sees who voted which way. Decided before anybody votes and locked
   * after — the screen says so on the poll, so nobody votes thinking they are anonymous when
   * they are not.
   */
  named: boolean
  results: PollResults
  /** ISO 8601. Absent means a draft that nobody but the committee can see. */
  opensAt?: string
  /** ISO 8601. Absent means it stays open until somebody closes it. */
  closesAt?: string
  createdAt: string
}

/** What the form edits. Empty strings for the dates mean "not set". */
export type PollDraft = {
  title: string
  detail: string
  options: string[]
  named: boolean
  results: PollResults
  opensAt: string
  closesAt: string
}

/** One poll as a member sees it: their household's vote, and the totals when they may see them. */
export type PollView = {
  poll: Poll
  /** The option their household chose. Absent if they have not voted. */
  myVote?: number
  /** Votes per option, in option order. Absent while the totals are not theirs to see. */
  tally?: number[]
}

/** On a named poll, who chose what. The committee's view only. */
export type PollVoter = { household: string; option: number }

/** One poll as the committee sees it. */
export type PollSummary = {
  poll: Poll
  tally: number[]
  /** Only on a named poll. On any other, who voted which way is not known to anybody. */
  voters?: PollVoter[]
}

export type PollState = 'draft' | 'scheduled' | 'open' | 'closed'

export const POLL_TITLE_MIN = 3
export const POLL_TITLE_MAX = 200
export const POLL_DETAIL_MAX = 1000
export const POLL_OPTIONS_MIN = 2
export const POLL_OPTIONS_MAX = 8
export const OPTION_MAX = 120

const time = (iso: string | undefined) => (iso ? Date.parse(iso) : Number.NaN)

/** Where a poll — or a quiz, which has the same two dates — is in its life. */
export function stateOf(item: { opensAt?: string; closesAt?: string }, at: Date): PollState {
  if (!item.opensAt) return 'draft'
  if (time(item.opensAt) > at.getTime()) return 'scheduled'
  if (item.closesAt && time(item.closesAt) <= at.getTime()) return 'closed'
  return 'open'
}

export const isOpen = (item: { opensAt?: string; closesAt?: string }, at: Date) => stateOf(item, at) === 'open'

/**
 * Whether a member may see the totals now. The same answer `portal.poll_results()` gives:
 * never on a committee-only poll, and otherwise once the poll closes or — on an after-vote
 * poll — once their household has voted.
 */
export function canSeeResults(poll: Poll, voted: boolean, at: Date): boolean {
  if (poll.results === 'committee') return false
  const closed = stateOf(poll, at) === 'closed'
  if (poll.results === 'after_close') return closed
  return voted || closed
}

/** The options as typed, without the blank rows a form leaves behind. */
export const filledOptions = (options: string[]) => options.map((o) => o.trim()).filter(Boolean)

export function validatePoll(draft: PollDraft): ContentErrors {
  const errors: ContentErrors = {}
  const title = draft.title.trim()
  if (title.length < POLL_TITLE_MIN) errors.title = 'Ask the question in a few words.'
  else if (title.length > POLL_TITLE_MAX) errors.title = `Keep the question under ${POLL_TITLE_MAX} characters.`
  if (draft.detail.length > POLL_DETAIL_MAX) errors.detail = `Keep the background under ${POLL_DETAIL_MAX} characters.`

  const options = filledOptions(draft.options)
  if (options.length < POLL_OPTIONS_MIN) errors.options = 'Give at least two choices.'
  else if (options.length > POLL_OPTIONS_MAX) errors.options = `No more than ${POLL_OPTIONS_MAX} choices.`
  else if (options.some((o) => o.length > OPTION_MAX)) errors.options = `Keep each choice under ${OPTION_MAX} characters.`
  else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) errors.options = 'Two of the choices are the same.'

  if (draft.closesAt && !draft.opensAt) errors.closesAt = 'Set when it opens before setting when it closes.'
  else if (draft.closesAt && Date.parse(draft.closesAt) <= Date.parse(draft.opensAt)) {
    errors.closesAt = 'It has to close after it opens.'
  }
  return errors
}

/** The form's starting point: an existing poll, or a blank one with two empty choices. */
export function pollDraftOf(poll?: Poll): PollDraft {
  return {
    title: poll?.title ?? '',
    detail: poll?.detail ?? '',
    options: poll ? [...poll.options] : ['', ''],
    named: poll?.named ?? false,
    results: poll?.results ?? 'after_vote',
    opensAt: poll?.opensAt ?? '',
    closesAt: poll?.closesAt ?? '',
  }
}

/** Open ones first, then what is coming, then what has closed, newest first within each. */
export function byState<T extends { opensAt?: string; closesAt?: string; createdAt: string }>(items: T[], at: Date): T[] {
  const order: Record<PollState, number> = { open: 0, scheduled: 1, draft: 2, closed: 3 }
  return [...items].sort(
    (a, b) =>
      order[stateOf(a, at)] - order[stateOf(b, at)] ||
      (b.opensAt ?? b.createdAt).localeCompare(a.opensAt ?? a.createdAt),
  )
}

/** "12 votes", "1 vote". */
export const votesLabel = (n: number) => `${n} ${n === 1 ? 'vote' : 'votes'}`

/** A share of the total, as a whole percentage. Zero when nobody has voted. */
export function share(votes: number, tally: number[]): number {
  const total = tally.reduce((sum, n) => sum + n, 0)
  return total === 0 ? 0 : Math.round((votes / total) * 100)
}
