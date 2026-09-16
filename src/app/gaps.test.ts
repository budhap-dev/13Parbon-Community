import { describe, expect, it } from 'vitest'
import { countGaps, gapsNow } from './gaps'
import { defaultSettings } from './defaults'

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

describe('a placeholder inside a sentence', () => {
  it('counts, because it is on the page whether or not the sentence starts with it', () => {
    // "usually [N] weeks before the event" — a finished sentence with a hole in it, shipped on
    // the About page while this file reported "Nothing in brackets". Hiding asks whether the
    // whole string is a placeholder; counting has to ask whether any of it is.
    // With settings, as the page always calls it: the saved questions are {question, answer},
    // while the file's are {q, a}, and the link that fills a gap only knows the former.
    const about = gapsNow(defaultSettings).find((gap) => gap.page === 'About us')!
    expect(about.where).toContain('faq › 4 › answer')
  })
})
