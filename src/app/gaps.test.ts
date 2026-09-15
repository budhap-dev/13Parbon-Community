import { describe, expect, it } from 'vitest'
import { countGaps, gapsNow } from './gaps'

describe('counting what is still to fill in', () => {
  it('counts from the content rather than from a number somebody typed', () => {
    // The screen used to claim 24 — 7, 13 and 4, written when the pages were built. By the
    // time anybody checked, the committee had filled in all but one of them.
    const gaps = gapsNow()
    expect(countGaps(gaps)).toBeLessThan(24)
  })

  it('names where each one is, not just how many there are', () => {
    const found = gapsNow().flatMap((gap) => gap.where)
    for (const where of found) expect(where.length).toBeGreaterThan(0)
  })

  it('finds the mission statement, which is the one still bracketed', () => {
    const home = gapsNow().find((gap) => gap.page === 'Home page')!
    expect(home.where).toContain('missionStatement')
  })

  it('covers all three pages, even the ones with nothing left', () => {
    expect(gapsNow().map((gap) => gap.page)).toEqual(['Home page', 'About us', 'Privacy'])
  })
})
