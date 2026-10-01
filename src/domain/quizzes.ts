/**
 * Quizzes: the committee writes the questions, households and visitors play.
 *
 * Two things matter more than the rest, and both are kept by the database
 * (`supabase/polls-quizzes.sql`) rather than by these types:
 *
 * - **The right answer never reaches a browser before somebody plays.** A `Question` has no
 *   field for it. Only the committee's `BankQuestion` carries `correct`, and a quiz is marked
 *   by `portal.submit_quiz()`, which hands the answers back only once there is a score.
 * - **One play per household.** A visitor's play is counted and nothing else is kept.
 */

import { filledOptions, OPTION_MAX } from './polls'
import type { ContentErrors } from './news'

export type QuizAudience = 'public' | 'members'

export const QUIZ_AUDIENCE: Record<QuizAudience, string> = {
  public: 'Everyone, on the public website',
  members: 'Members only',
}

/** A question as a player sees it. No answer in it, by design. */
export type Question = {
  id: string
  prompt: string
  options: string[]
  /** A festival picture, from the photographs bucket. */
  imageUrl?: string
  explanation: string
  tags: string[]
  /** The household that suggested it, when they asked to be credited. */
  creditedTo?: string
}

/** A question as the committee sees it, with its answer and whether it can still change. */
export type BankQuestion = Question & {
  correct: number
  /** Somebody has answered it in a quiz, so the wording and the answer are fixed. */
  locked: boolean
}

export type QuestionDraft = {
  prompt: string
  options: string[]
  correct: number
  explanation: string
  tags: string[]
  imageUrl: string
  creditedTo: string
}

export type Quiz = {
  id: string
  title: string
  intro: string
  audience: QuizAudience
  /** ISO 8601. Absent means a draft. */
  opensAt?: string
  closesAt?: string
  createdAt: string
  /** In the order they are asked. */
  questionIds: string[]
}

export type QuizDraft = {
  title: string
  intro: string
  audience: QuizAudience
  opensAt: string
  closesAt: string
  questionIds: string[]
}

/** A quiz in a list, for whoever is looking. */
export type QuizCard = {
  quiz: Quiz
  questionCount: number
  /** Their household's score, once they have played. Members only. */
  played?: { score: number; total: number }
}

/** A quiz ready to play: its questions, in order, with no answers. */
export type PlayableQuiz = { quiz: Quiz; questions: Question[] }

/** What comes back from playing. */
export type QuizResult = {
  score: number
  total: number
  /** The right option for each question, in order. */
  correct: number[]
  explanations: string[]
}

/** A line on the leaderboard. No household name where they chose not to be shown. */
export type LeaderRow = { household?: string; score: number; total: number }

/** A quiz as the committee sees it in the list. */
export type QuizStats = {
  quiz: Quiz
  /** Member households who played. */
  memberPlays: number
  /** Visitors who played, as a number and nothing else. */
  publicPlays: number
  /** Somebody has played, so its questions are fixed. */
  locked: boolean
}

/** One household's play, for the committee. */
export type QuizAttempt = { household: string; score: number; total: number; showName: boolean; playedAt: string }

export const QUIZ_TITLE_MIN = 3
export const QUIZ_TITLE_MAX = 200
export const QUIZ_INTRO_MAX = 1000
export const PROMPT_MIN = 3
export const PROMPT_MAX = 300
export const QUESTION_OPTIONS_MIN = 2
export const QUESTION_OPTIONS_MAX = 6
export const EXPLANATION_MAX = 600
export const QUIZ_QUESTIONS_MAX = 30

export function validateQuestion(draft: QuestionDraft): ContentErrors {
  const errors: ContentErrors = {}
  const prompt = draft.prompt.trim()
  if (prompt.length < PROMPT_MIN) errors.prompt = 'Write the question.'
  else if (prompt.length > PROMPT_MAX) errors.prompt = `Keep the question under ${PROMPT_MAX} characters.`

  const options = draft.options.map((o) => o.trim())
  const filled = filledOptions(draft.options)
  if (filled.length < QUESTION_OPTIONS_MIN) errors.options = 'Give at least two answers to choose from.'
  else if (filled.length > QUESTION_OPTIONS_MAX) errors.options = `No more than ${QUESTION_OPTIONS_MAX} answers.`
  else if (filled.length !== options.length) errors.options = 'Fill in every answer, or remove the empty one.'
  else if (filled.some((o) => o.length > OPTION_MAX)) errors.options = `Keep each answer under ${OPTION_MAX} characters.`
  else if (new Set(filled.map((o) => o.toLowerCase())).size !== filled.length) errors.options = 'Two of the answers are the same.'

  if (!errors.options && !(draft.correct >= 0 && draft.correct < options.length)) errors.correct = 'Mark which answer is right.'
  if (draft.explanation.length > EXPLANATION_MAX) errors.explanation = `Keep the explanation under ${EXPLANATION_MAX} characters.`
  if (draft.imageUrl.trim() && !/^https:\/\//.test(draft.imageUrl.trim())) errors.imageUrl = 'A picture has to be a secure (https) link.'
  return errors
}

export function validateQuiz(draft: QuizDraft): ContentErrors {
  const errors: ContentErrors = {}
  const title = draft.title.trim()
  if (title.length < QUIZ_TITLE_MIN) errors.title = 'Give the quiz a name.'
  else if (title.length > QUIZ_TITLE_MAX) errors.title = `Keep the name under ${QUIZ_TITLE_MAX} characters.`
  if (draft.intro.length > QUIZ_INTRO_MAX) errors.intro = `Keep the introduction under ${QUIZ_INTRO_MAX} characters.`
  if (draft.questionIds.length === 0 && draft.opensAt) errors.questionIds = 'Add at least one question before opening it.'
  else if (draft.questionIds.length > QUIZ_QUESTIONS_MAX) errors.questionIds = `No more than ${QUIZ_QUESTIONS_MAX} questions.`
  if (draft.closesAt && !draft.opensAt) errors.closesAt = 'Set when it opens before setting when it closes.'
  else if (draft.closesAt && Date.parse(draft.closesAt) <= Date.parse(draft.opensAt)) {
    errors.closesAt = 'It has to close after it opens.'
  }
  return errors
}

export function questionDraftOf(question?: BankQuestion): QuestionDraft {
  return {
    prompt: question?.prompt ?? '',
    options: question ? [...question.options] : ['', ''],
    correct: question?.correct ?? 0,
    explanation: question?.explanation ?? '',
    tags: question ? [...question.tags] : [],
    imageUrl: question?.imageUrl ?? '',
    creditedTo: question?.creditedTo ?? '',
  }
}

export function quizDraftOf(quiz?: Quiz): QuizDraft {
  return {
    title: quiz?.title ?? '',
    intro: quiz?.intro ?? '',
    audience: quiz?.audience ?? 'members',
    opensAt: quiz?.opensAt ?? '',
    closesAt: quiz?.closesAt ?? '',
    questionIds: quiz ? [...quiz.questionIds] : [],
  }
}

/** Marks a set of answers. The database does this for real; the mock and the tests use it. */
export function mark(answers: (number | undefined)[], correct: number[]): number {
  return correct.reduce((score, right, i) => score + (answers[i] === right ? 1 : 0), 0)
}

/** "7 / 10" */
export const scoreLine = (score: number, total: number) => `${score} / ${total}`

/** A few words for a score, kinder at the bottom than the top. */
export function verdict(score: number, total: number): string {
  if (total === 0) return 'Nothing to mark.'
  const ratio = score / total
  if (ratio === 1) return 'Full marks!'
  if (ratio >= 0.7) return 'Very well done.'
  if (ratio >= 0.4) return 'Not bad at all.'
  return 'Thanks for playing — you will know them next time.'
}

/** Tags as typed into one box: "durga-puja, food" → ['durga-puja', 'food']. */
export function tagsFrom(text: string): string[] {
  return [...new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))]
}
