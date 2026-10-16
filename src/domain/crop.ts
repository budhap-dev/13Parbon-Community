/**
 * The arithmetic of placing a photograph in its circle: pure, so it can be tested without a
 * picture. Used by `PhotoCropper`.
 */

/** The window the picture is placed in, in screen pixels. The circle inside it is what shows. */
export const FRAME = 260
export const MAX_ZOOM = 4
/** How far one press of an arrow key moves the picture. */
export const STEP = 12

export type Size = { width: number; height: number }
/** How far in, and where the picture's top-left corner sits in the window. */
export type Place = { zoom: number; x: number; y: number }

/** How much the picture is scaled to fill the window at this zoom: at 1, its short side fits. */
export const scaleOf = (size: Size, zoom: number) => (FRAME / Math.min(size.width, size.height)) * zoom

/** Keeps the picture covering the window, so the circle is never part-empty. */
export function held(size: Size, place: Place): Place {
  const s = scaleOf(size, place.zoom)
  // `|| 0` because a minus zero is still zero, but not to anything that compares them.
  const clamp = (value: number, length: number) => Math.min(0, Math.max(FRAME - length * s, value)) || 0
  return { zoom: place.zoom, x: clamp(place.x, size.width), y: clamp(place.y, size.height) }
}

/** The picture centred, at its smallest. */
export function centred(size: Size): Place {
  const s = scaleOf(size, 1)
  return { zoom: 1, x: (FRAME - size.width * s) / 2, y: (FRAME - size.height * s) / 2 }
}

/** A new zoom about the middle of the window, so what is in the middle stays there. */
export function zoomed(size: Size, place: Place, zoom: number): Place {
  const next = Math.min(MAX_ZOOM, Math.max(1, zoom))
  const before = scaleOf(size, place.zoom)
  const after = scaleOf(size, next)
  const cx = (FRAME / 2 - place.x) / before
  const cy = (FRAME / 2 - place.y) / before
  return held(size, { zoom: next, x: FRAME / 2 - cx * after, y: FRAME / 2 - cy * after })
}

/** What the window shows, in the picture's own pixels: the square that will be uploaded. */
export function cropOf(size: Size, place: Place): { sx: number; sy: number; sw: number; sh: number } {
  const s = scaleOf(size, place.zoom)
  const side = FRAME / s
  return { sx: Math.round(-place.x / s) || 0, sy: Math.round(-place.y / s) || 0, sw: Math.round(side), sh: Math.round(side) }
}
