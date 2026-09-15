/**
 * How the cover photograph behaves.
 *
 * Kept small on purpose. A handful of quiet options is a choice; twenty is a way of making an
 * event page look like a slideshow, and the story is explicit that this is a calm noticeboard
 * rather than something competing for attention.
 *
 * Every one of these is a CSS animation on `transform`, `opacity` or `filter`, which the
 * browser can do on its own thread. Nothing here runs JavaScript on a timer.
 */
export type CoverAnimation = 'none' | 'zoom' | 'drift' | 'fade' | 'colour'

export const COVER_ANIMATIONS: { value: CoverAnimation; label: string; note: string }[] = [
  { value: 'none', label: 'Still', note: 'The photograph, as it is. The right answer more often than not.' },
  {
    value: 'zoom',
    label: 'Slow zoom',
    note: 'Drifts closer over about twenty seconds and back again. Barely noticeable, which is the idea.',
  },
  {
    value: 'drift',
    label: 'Slow drift',
    note: 'Moves gently across. Suits a wide photograph — a full hall, a stage from the back.',
  },
  { value: 'fade', label: 'Fade in', note: 'Arrives once when the page opens, then sits still.' },
  {
    value: 'colour',
    label: 'Into colour',
    note: 'Starts black and white and warms up. The same idea as this year’s theme photographs.',
  },
]

export const COVER_LABELS: Record<CoverAnimation, string> = Object.fromEntries(
  COVER_ANIMATIONS.map((a) => [a.value, a.label]),
) as Record<CoverAnimation, string>

export function isCoverAnimation(value: string): value is CoverAnimation {
  return COVER_ANIMATIONS.some((a) => a.value === value)
}
