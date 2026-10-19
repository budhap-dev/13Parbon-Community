import { describe, expect, it } from 'vitest'
import { rituals } from '../bengaliYear'
import { SEASONS, seasonFor } from './seasons'

const themeOn = (day: string) => seasonFor(day)?.theme ?? null

describe('the festivals’ colours by the calendar', () => {
  it('names a ritual the calendar has for every season', () => {
    for (const { ritual } of SEASONS) expect(rituals.some((r) => r.id === ritual), ritual).toBe(true)
  })

  it('wears a festival’s theme from five days before it to five days after, and not a day more', () => {
    // Kali Puja, 8 November 2026.
    expect(themeOn('2026-11-02')).toBeNull()
    expect(themeOn('2026-11-03')).toBe('deepavali')
    expect(themeOn('2026-11-08')).toBe('deepavali')
    expect(themeOn('2026-11-13')).toBe('deepavali')
    expect(themeOn('2026-11-14')).toBeNull()
  })

  it('counts the five days from the first and last of a puja that runs over several', () => {
    // Durga Puja, 17 to 21 October 2026.
    expect(themeOn('2026-10-19')).toBe('festival')
    expect(themeOn('2026-10-22')).toBe('festival')
  })

  it('splits the days between two festivals whose windows would overlap, nearer first', () => {
    // Mahalaya on the 10th, Durga Puja from the 17th: the days between go to whichever is nearer.
    expect(themeOn('2026-10-05')).toBe('mahalaya')
    expect(themeOn('2026-10-13')).toBe('mahalaya')
    expect(themeOn('2026-10-14')).toBe('festival')
    // Durga Puja to the 21st, Lakshmi Puja on the 25th: the 23rd is two days from each, and goes
    // to the one still to come.
    expect(themeOn('2026-10-22')).toBe('festival')
    expect(themeOn('2026-10-23')).toBe('kojagori')
    expect(themeOn('2026-10-30')).toBe('kojagori')
    expect(themeOn('2026-10-31')).toBeNull()
  })

  it('has each of the year’s festivals in its own colours', () => {
    expect(themeOn('2026-04-15')).toBe('poila-boishakh')
    expect(themeOn('2026-10-10')).toBe('mahalaya')
    expect(themeOn('2027-02-11')).toBe('saraswati')
    expect(themeOn('2027-03-22')).toBe('holi')
    expect(themeOn('2027-04-15')).toBe('poila-boishakh')
  })

  it('carries on into 1434, the next year entered', () => {
    expect(themeOn('2027-09-29')).toBe('mahalaya')
    expect(themeOn('2027-10-07')).toBe('festival')
    expect(themeOn('2027-10-14')).toBe('kojagori')
    expect(themeOn('2027-10-28')).toBe('deepavali')
    expect(themeOn('2028-01-31')).toBe('saraswati')
    expect(themeOn('2028-03-11')).toBe('holi')
    expect(themeOn('2028-04-14')).toBe('poila-boishakh')
  })

  it('keeps Borodin on Christmas every year, the panjika or not', () => {
    expect(seasonFor('2026-12-20')).toMatchObject({ theme: 'borodin', name: 'Borodin' })
    expect(themeOn('2026-12-19')).toBeNull()
    expect(themeOn('2029-12-30')).toBe('borodin')
    expect(themeOn('2029-12-31')).toBeNull()
  })

  it('leaves the rest of the year to the committee', () => {
    expect(themeOn('2026-09-01')).toBeNull()
    expect(themeOn('2026-06-01')).toBeNull()
  })
})
