import { describe, expect, it } from 'vitest'
import { centred, cropOf, FRAME, held, zoomed } from './crop'

/** A landscape photograph, twice as wide as it is tall. */
const wide = { width: 2000, height: 1000 }

describe('placing a photograph in its circle', () => {
  it('starts centred, its short side filling the window', () => {
    const place = centred(wide)
    expect(place.zoom).toBe(1)
    expect(place.y).toBe(0)
    expect(place.x).toBe(-FRAME / 2)
    // The middle square of the picture.
    expect(cropOf(wide, place)).toEqual({ sx: 500, sy: 0, sw: 1000, sh: 1000 })
  })

  it('never leaves part of the circle empty, however far it is dragged', () => {
    expect(held(wide, { zoom: 1, x: 500, y: 500 })).toEqual({ zoom: 1, x: 0, y: 0 })
    expect(cropOf(wide, held(wide, { zoom: 1, x: -99999, y: 0 }))).toEqual({ sx: 1000, sy: 0, sw: 1000, sh: 1000 })
  })

  it('zooms about the middle, so the face in the middle stays there', () => {
    const crop = cropOf(wide, zoomed(wide, centred(wide), 2))
    expect(crop).toEqual({ sx: 750, sy: 250, sw: 500, sh: 500 })
  })

  it('goes no further out than filling the window, and no further in than four times', () => {
    expect(zoomed(wide, centred(wide), 0.2).zoom).toBe(1)
    expect(zoomed(wide, centred(wide), 9).zoom).toBe(4)
  })
})
