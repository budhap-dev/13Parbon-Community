/**
 * A readable address from a title.
 *
 * One copy, because there were three: news posts, albums and now events all turn a name people
 * typed into something that can sit in a URL, and three versions of that is three chances for
 * two of them to drift apart.
 */
export function slugFrom(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * The same, made unique against what is already there.
 *
 * Two events called "Durga Puja" in successive years is the ordinary case, not an error, so
 * this numbers rather than refuses. A committee that has to invent a different name for the
 * same festival every year is being asked to work around us.
 */
export function uniqueSlug(title: string, taken: string[], fallback = 'untitled'): string {
  const base = slugFrom(title) || fallback
  if (!taken.includes(base)) return base
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`
    if (!taken.includes(candidate)) return candidate
  }
}
