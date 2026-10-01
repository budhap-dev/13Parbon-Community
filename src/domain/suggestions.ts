/**
 * What members suggest for a quiz or a poll, and what the committee decides.
 *
 * Nothing a member suggests goes anywhere by itself. Approving a question copies it into the
 * question bank; approving a poll opens the poll form with it filled in. Either way a person on
 * the committee has read it first.
 */

import { filledOptions, OPTION_MAX } from './polls'
import type { ContentErrors } from './news'
import { PROMPT_MAX, PROMPT_MIN, QUESTION_OPTIONS_MAX } from './quizzes'

export type SuggestionKind = 'question' | 'poll'
export type SuggestionStatus = 'pending' | 'approved' | 'rejected'

export type SuggestionDraft = {
  kind: SuggestionKind
  prompt: string
  options: string[]
  /** For a question: which option is right. A poll has none. */
  answer?: number
  note: string
  /** Whether they would like their household named on it. */
  credit: boolean
}

export type Suggestion = {
  id: string
  kind: SuggestionKind
  prompt: string
  options: string[]
  answer?: number
  note: string
  credit: boolean
  householdId: string
  /** The household's name. Filled in for the committee; a member reads only their own. */
  household?: string
  status: SuggestionStatus
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
}

export const SUGGESTION_NOTE_MAX = 1000
export const SUGGESTION_OPTIONS_MAX = 8

export function validateSuggestion(draft: SuggestionDraft): ContentErrors {
  const errors: ContentErrors = {}
  const prompt = draft.prompt.trim()
  if (prompt.length < PROMPT_MIN) errors.prompt = draft.kind === 'question' ? 'Write the question.' : 'Write what to ask.'
  else if (prompt.length > PROMPT_MAX) errors.prompt = `Keep it under ${PROMPT_MAX} characters.`

  const options = filledOptions(draft.options)
  const most = draft.kind === 'question' ? QUESTION_OPTIONS_MAX : SUGGESTION_OPTIONS_MAX
  if (options.length < 2) errors.options = 'Give at least two choices.'
  else if (options.length > most) errors.options = `No more than ${most} choices.`
  // Every row filled, so "the second one is right" means the second one that was typed.
  else if (options.length !== draft.options.length) errors.options = 'Fill in every choice, or remove the empty one.'
  else if (options.some((o) => o.length > OPTION_MAX)) errors.options = `Keep each choice under ${OPTION_MAX} characters.`

  if (draft.kind === 'question' && !errors.options) {
    if (draft.answer === undefined || draft.answer < 0 || draft.answer >= options.length) {
      errors.answer = 'Say which answer is right.'
    }
  }
  if (draft.note.length > SUGGESTION_NOTE_MAX) errors.note = `Keep the note under ${SUGGESTION_NOTE_MAX} characters.`
  return errors
}

/** The draft trimmed, with an answer only where there should be one. */
export function tidySuggestion(draft: SuggestionDraft): SuggestionDraft {
  return {
    kind: draft.kind,
    prompt: draft.prompt.trim(),
    options: filledOptions(draft.options),
    ...(draft.kind === 'question' ? { answer: draft.answer } : {}),
    note: draft.note.trim(),
    credit: draft.credit,
  }
}

export const waitingSuggestions = (all: Suggestion[]) => all.filter((s) => s.status === 'pending')

/** Waiting first, then newest — the same order as every other queue the committee works. */
export function suggestionsForReview(all: Suggestion[]): Suggestion[] {
  return [...all].sort(
    (a, b) =>
      Number(b.status === 'pending') - Number(a.status === 'pending') || b.createdAt.localeCompare(a.createdAt),
  )
}

export const SUGGESTION_STATUS: Record<SuggestionStatus, string> = {
  pending: 'Waiting for the committee',
  approved: 'Used — thank you',
  rejected: 'Not this time',
}
