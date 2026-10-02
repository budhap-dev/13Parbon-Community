/**
 * How the cover photograph behaves.
 *
 * Kept small on purpose. A handful of quiet options is a choice; twenty is a way of making an
 * event page look like a slideshow, and the story is explicit that this is a calm noticeboard
 * rather than something competing for attention.
 *
 * Two kinds, and the menu says which is which: a movement that happens once as the photograph
 * arrives and then stops, and one that keeps going, slowly, for as long as the page is open.
 *
 * Every one of these is a CSS animation on `transform`, `opacity` or `filter`, which the
 * browser can do on its own thread. Nothing here runs JavaScript on a timer. Each starts when
 * the photograph has arrived rather than when the page opens — on a phone a large photograph
 * takes a second or two, and a fade that started without it finished before there was anything
 * to see.
 *
 * `drift` keeps its stored name though the menu calls it "Pan across": evenings already saved
 * with it carry on, and simply move enough now to be seen.
 */
export type CoverAnimation = 'none' | 'fade' | 'rise' | 'colour' | 'zoom' | 'drift' | 'kenburns'

export type CoverKind = 'still' | 'once' | 'continuous'

export const COVER_ANIMATIONS: { value: CoverAnimation; label: string; kind: CoverKind; note: string }[] = [
  { value: 'none', label: 'Still', kind: 'still', note: 'The photograph, as it is. The right answer more often than not.' },
  {
    value: 'fade',
    label: 'Fade in',
    kind: 'once',
    note: 'Appears gently out of the page over a second and a half, once the photograph has arrived, then sits still.',
  },
  {
    value: 'rise',
    label: 'Rise into place',
    kind: 'once',
    note: 'Fades in while settling up into its place, as though set down on the page. Once, then still.',
  },
  {
    value: 'colour',
    label: 'Into colour',
    kind: 'once',
    note: 'Arrives in black and white, and the colour sweeps across it from the left — like the then-and-now photographs on the home page.',
  },
  {
    value: 'zoom',
    label: 'Slow zoom',
    kind: 'continuous',
    note: 'Moves steadily closer for twelve seconds and back again, over and over. Suits a stage or a decorated idol.',
  },
  {
    value: 'drift',
    label: 'Pan across',
    kind: 'continuous',
    note: 'Travels slowly from one side to the other and back. Suits a wide photograph — a full hall, a stage from the back.',
  },
  {
    value: 'kenburns',
    label: 'Ken Burns',
    kind: 'continuous',
    note: 'Zooms and drifts at once, the way documentaries move across a still photograph. The liveliest of these.',
  },
]

export const COVER_KINDS: { kind: Exclude<CoverKind, 'still'>; label: string }[] = [
  { kind: 'once', label: 'Once, as the page opens' },
  { kind: 'continuous', label: 'Keeps moving, slowly' },
]

export const COVER_LABELS: Record<CoverAnimation, string> = Object.fromEntries(
  COVER_ANIMATIONS.map((a) => [a.value, a.label]),
) as Record<CoverAnimation, string>

export function isCoverAnimation(value: string): value is CoverAnimation {
  return COVER_ANIMATIONS.some((a) => a.value === value)
}
