import type { ContentErrors } from '@/domain/news'

/**
 * The refusals to show, of those the form has actually made.
 *
 * `refused` is what the last press of the button objected to; `now` is what is wrong at this
 * moment. Showing the overlap means two things. A red line goes as soon as the thing it
 * objected to has been put right, rather than sitting under a box that is now perfectly good
 * until somebody presses the button again — which is what it did, and it reads as a form that
 * has stopped listening. And nothing new appears while somebody is still typing: a box they
 * have not reached yet is not a mistake.
 *
 * The message comes from `now` rather than from `refused`, so a field that has gone from too
 * short to too long says the thing that is true of it.
 */
export function outstanding(refused: ContentErrors, now: ContentErrors): ContentErrors {
  return Object.fromEntries(
    Object.keys(refused)
      .filter((field) => now[field])
      .map((field) => [field, now[field]]),
  )
}
