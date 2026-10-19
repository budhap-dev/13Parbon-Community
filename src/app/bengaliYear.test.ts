import { describe, expect, it } from 'vitest'
import { addCivilDays, monthLength, monthStarts, toBengali } from '@/domain/bengaliDate'
import { RITUAL_YEARS, rituals } from './bengaliYear'

const byId = (id: string, year = '2026') => rituals.find((ritual) => ritual.id === id && ritual.date.startsWith(year))!

/** The Bengali date of a ritual, as "day month" with Boishakh as 0. */
const bengaliOf = (id: string, year?: string) => {
  const { month, day } = toBengali(byId(id, year).date)
  return { month, day }
}

/** The last day of a month of 1433. */
const lastOf = (month: number) => ({ month, day: monthLength(1433, month) })

describe('the rituals of 1433', () => {
  it('fall in the year, and a multi-day one is in order with its named days inside it', () => {
    const [first, next] = [monthStarts(1433)[0], monthStarts(1433)[12]]
    for (const ritual of rituals) {
      // Poila Boishakh 1434 is the one entry on the year after's first day.
      expect(ritual.date >= first && ritual.date <= next, ritual.id).toBe(true)
      if (ritual.until) expect(ritual.until > ritual.date, ritual.id).toBe(true)
      for (const day of ritual.days ?? []) {
        expect(day.date >= ritual.date && day.date <= (ritual.until ?? ritual.date), `${ritual.id} ${day.name}`).toBe(true)
      }
    }
    expect(RITUAL_YEARS).toContain(1433)
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

  it('has Durga Puja run Shashthi to Dashami on five days running', () => {
    const puja = byId('durga-puja')
    expect(puja.days?.map((day) => day.date)).toEqual([0, 1, 2, 3, 4].map((n) => addCivilDays(puja.date, n)))
    expect(puja.until).toBe(puja.days?.at(-1)?.date)
  })
})
