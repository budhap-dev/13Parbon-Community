/** Lower case, accents off, so "Dasgupta" finds "dasgupta" and "Ronnie" finds "Rónnie". */
export const folded = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** What was typed, as the words to look for. Empty when there is nothing to look for. */
export const searchWords = (query: string): string[] => folded(query).split(/\s+/).filter(Boolean)

/**
 * Whether every word turns up somewhere in the text.
 *
 * Every word rather than any, so "das ruma" finds Ruma in the Dases and not every Das. The text
 * is expected folded already, so a list searched on every keystroke folds itself once.
 */
export function matchesEvery(words: readonly string[], foldedText: string): boolean {
  return words.every((word) => foldedText.includes(word))
}
