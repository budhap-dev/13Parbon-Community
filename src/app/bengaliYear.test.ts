import { describe, expect, it } from 'vitest'
import { addCivilDays, monthLength, monthStarts, toBengali } from '@/domain/bengaliDate'
import { RITUAL_YEARS, rituals } from './bengaliYear'
import { year1431 } from './bengaliYear1431'
import { year1432 } from './bengaliYear1432'
import { year1433 } from './bengaliYear1433'
import { year1434 } from './bengaliYear1434'
import { year1435 } from './bengaliYear1435'

const YEARS = [
  [1431, year1431],
  [1432, year1432],
  [1433, year1433],
  [1434, year1434],
  [1435, year1435],
] as const

const byId = (id: string, year = '2026') => rituals.find((ritual) => ritual.id === id && ritual.date.startsWith(year))!

/** The Bengali date of a ritual, as "day month" with Boishakh as 0. */
const bengaliOf = (id: string, year?: string) => {
  const { month, day } = toBengali(byId(id, year).date)
  return { month, day }
}

/** The last day of a month. */
const lastOf = (month: number, year = 1433) => ({ month, day: monthLength(year, month) })

describe('the years entered', () => {
  it('has each year’s entries in that year, a multi-day one in order with its named days inside it', () => {
    for (const [year, list] of YEARS) {
      const [first, next] = [monthStarts(year)[0], monthStarts(year)[12]]
      for (const ritual of list) {
        // The next year's Poila Boishakh is the one entry on the year after's first day.
        expect(ritual.date >= first && ritual.date <= next, `${year} ${ritual.id}`).toBe(true)
        if (ritual.until) expect(ritual.until > ritual.date, ritual.id).toBe(true)
        for (const day of ritual.days ?? []) {
          expect(day.date >= ritual.date && day.date <= (ritual.until ?? ritual.date), `${ritual.id} ${day.name}`).toBe(true)
        }
      }
    }
    expect(RITUAL_YEARS).toEqual(YEARS.map(([year]) => year))
    expect(rituals).toHaveLength(YEARS.reduce((sum, [, list]) => sum + list.length, 0))
  })

  it('has every occasion of 1433 in every other year, once', () => {
    const ids = (list: readonly (typeof rituals)[number][]) => [...new Set(list.map((ritual) => ritual.id))].sort()
    // 1435 has an extra Chaitra in 2029, which puts the spring Navaratri into Boishakh 1436.
    const spring = ['basanti-puja', 'annapurna-puja', 'ram-navami']
    for (const [year, list] of YEARS) {
      const expected = ids(year1433).filter((id) => year !== 1435 || !spring.includes(id))
      expect(ids(list), `${year}`).toEqual(expected)
      // 1433 alone has two Poila Boishakhs, its own and 1434's; the one Poila Boishakh test below.
      expect(list.filter((ritual) => ritual.id !== 'poila-boishakh'), `${year}`).toHaveLength(expected.length - 1)
    }
  })

  it('has one Poila Boishakh for each year from 1431 to 1436', () => {
    const days = rituals.filter((ritual) => ritual.id === 'poila-boishakh').map((ritual) => ritual.date)
    expect(days).toEqual([1431, 1432, 1433, 1434, 1435, 1436].map((year) => monthStarts(year)[0]))
  })

  it('has no two entries sharing an id in the same year', () => {
    const keys = rituals.map((ritual) => `${ritual.id}-${ritual.date.slice(0, 4)}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  /*
   * The ones fixed by the Bengali date rather than the moon, checked against the months as they
   * are worked out. If one of these fails, either the date was typed wrong or the months have
   * moved — and the page would put the two a day apart.
   */
  it('keeps the days fixed by the Bengali date on them', () => {
    expect(bengaliOf('poila-boishakh')).toEqual({ month: 0, day: 1 })
    expect(bengaliOf('poila-boishakh', '2027')).toEqual({ month: 0, day: 1 })
    expect(bengaliOf('rabindra-jayanti')).toEqual({ month: 0, day: 25 })
    expect(bengaliOf('nazrul-jayanti')).toEqual({ month: 1, day: 11 })
    expect(bengaliOf('nabanna')).toEqual({ month: 7, day: 1 })
  })

  it('keeps the sankranti days on the last day of their month', () => {
    expect(bengaliOf('manasa-puja')).toEqual(lastOf(3))
    expect(bengaliOf('vishwakarma-puja')).toEqual(lastOf(4))
    expect(bengaliOf('kartik-puja')).toEqual(lastOf(6))
    expect(bengaliOf('poush-sankranti', '2027')).toEqual(lastOf(8))
    expect(bengaliOf('charak', '2027')).toEqual(lastOf(11))
  })

  it('gives every time with its Indian offset, and every span forwards', () => {
    for (const ritual of rituals) {
      for (const time of ritual.times ?? []) {
        expect(time.from, ritual.id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\+05:30$/)
        if (time.to) expect(new Date(time.to) > new Date(time.from), `${ritual.id} ${time.label}`).toBe(true)
      }
    }
  })

  it('has each tithi still running on the morning of its puja in Kolkata', () => {
    for (const ritual of rituals) {
      const tithi = ritual.times?.find((time) => time.label.endsWith('tithi'))
      if (!tithi?.to || ritual.days) continue
      // Sunrise in Kolkata is never before five; the tithi has begun by then and not yet ended.
      const morning = new Date(`${ritual.date}T05:00+05:30`)
      expect(new Date(tithi.from) <= new Date(`${ritual.date}T23:59+05:30`), ritual.id).toBe(true)
      expect(new Date(tithi.to) > morning, ritual.id).toBe(true)
    }
  })

  /*
   * The published sankranti times against the months as they are worked out from the sun: the
   * month begins the day after the sankranti in Kolkata. Two sources agreeing on the day.
   */
  it('puts each published sankranti on the day before its month begins', () => {
    for (const ritual of rituals) {
      for (const time of ritual.times ?? []) {
        if (!time.label.includes('sankranti')) continue
        const nextMonth = toBengali(addCivilDays(time.from.slice(0, 10), 1))
        expect(nextMonth.day, `${ritual.id} ${time.label}`).toBe(1)
      }
    }
  })

  it('keeps 1434’s fixed days and sankrantis where the months put them', () => {
    expect(bengaliOf('rabindra-jayanti', '2027')).toEqual({ month: 0, day: 25 })
    expect(bengaliOf('nazrul-jayanti', '2027')).toEqual({ month: 1, day: 11 })
    expect(bengaliOf('nabanna', '2027')).toEqual({ month: 7, day: 1 })
    expect(bengaliOf('poila-boishakh', '2028')).toEqual({ month: 0, day: 1 })
    expect(bengaliOf('manasa-puja', '2027')).toEqual(lastOf(3, 1434))
    expect(bengaliOf('vishwakarma-puja', '2027')).toEqual(lastOf(4, 1434))
    expect(bengaliOf('kartik-puja', '2027')).toEqual(lastOf(6, 1434))
    expect(bengaliOf('poush-sankranti', '2028')).toEqual(lastOf(8, 1434))
    expect(bengaliOf('charak', '2028')).toEqual(lastOf(11, 1434))
  })

  it('keeps every year’s fixed days and sankrantis where the months put them', () => {
    for (const [year, list] of YEARS) {
      const on = (id: string) => {
        const { month, day } = toBengali(list.find((ritual) => ritual.id === id)!.date)
        return { month, day }
      }
      const last = (month: number) => ({ month, day: monthLength(year, month) })
      expect(on('rabindra-jayanti'), `${year}`).toEqual({ month: 0, day: 25 })
      expect(on('nazrul-jayanti'), `${year}`).toEqual({ month: 1, day: 11 })
      expect(on('nabanna'), `${year}`).toEqual({ month: 7, day: 1 })
      expect(on('manasa-puja'), `${year}`).toEqual(last(3))
      expect(on('vishwakarma-puja'), `${year}`).toEqual(last(4))
      expect(on('kartik-puja'), `${year}`).toEqual(last(6))
      expect(on('poush-sankranti'), `${year}`).toEqual(last(8))
      expect(on('charak'), `${year}`).toEqual(last(11))
    }
  })

  it('has Durga Puja 1434 over six days, Sandhi Puja on a day of its own', () => {
    const puja = byId('durga-puja', '2027')
    expect(puja.days?.map((day) => day.date)).toEqual([0, 1, 2, 3, 4, 5].map((n) => addCivilDays(puja.date, n)))
    expect(puja.days?.[3].name).toBe('Sandhi Puja')
    expect(puja.until).toBe(puja.days?.at(-1)?.date)
  })

  it('has Durga Puja run Shashthi to Dashami on five days running', () => {
    const puja = byId('durga-puja')
    expect(puja.days?.map((day) => day.date)).toEqual([0, 1, 2, 3, 4].map((n) => addCivilDays(puja.date, n)))
    expect(puja.until).toBe(puja.days?.at(-1)?.date)
  })
})
