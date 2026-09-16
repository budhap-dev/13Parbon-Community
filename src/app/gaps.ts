import { about } from './about'
import { privacy } from './privacy'
import { isPlaceholder, site } from './site'
import type { SiteSettings } from '@/domain/settings'

/**
 * What the committee has not filled in yet, counted from the content itself.
 *
 * It used to be a hand-written list with hand-written numbers — 7, 13 and 4 — typed when the
 * pages were first built and never touched again. By the time anybody looked, the committee had
 * filled nearly all of it in and the screen was still announcing twenty-four gaps. A number
 * nobody recounts is worse than no number: it is believed for a while, and then none of the
 * screen is.
 *
 * A placeholder is a string written in [square brackets], which is the convention the content
 * files already use and which `isPlaceholder` already knows about.
 */
export type Gap = { page: string; where: string[] }

/** Every placeholder string inside a value, however deeply it is nested, with its path. */
function findGaps(value: unknown, path: string[] = []): string[] {
  if (typeof value === 'string') return isPlaceholder(value) ? [path.join(' › ')] : []
  if (Array.isArray(value)) return value.flatMap((item, i) => findGaps(item, [...path, `${i + 1}`]))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => findGaps(child, [...path, key]))
  }
  return []
}

/**
 * Pass the live settings, or the count is wrong in the direction that matters.
 *
 * Seven of these strings are the committee's to edit from /admin/content, and what a visitor
 * reads is the saved value, not the one in `site.ts`. Scanning only the file meant a line the
 * committee had filled in and saved was still counted as a gap — the screen announcing work
 * that was already done, which is the same stale number this file was written to get rid of,
 * pointing the other way.
 */
export function gapsNow(settings?: Pick<SiteSettings, 'text'>): Gap[] {
  const homePage = settings ? { ...site, ...settings.text } : site
  return [
    { page: 'Home page', where: findGaps(homePage) },
    { page: 'About us', where: findGaps(about) },
    { page: 'Privacy', where: findGaps(privacy) },
  ]
}

export function countGaps(gaps: Gap[]): number {
  return gaps.reduce((total, gap) => total + gap.where.length, 0)
}
