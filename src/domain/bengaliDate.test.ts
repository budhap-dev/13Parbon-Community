import {
  addCivilDays,
  bengaliDigits,
  civilDate,
  civilDaysBetween,
  formatBengaliDate,
  formatBengaliDateInEnglish,
  fromBengali,
  monthCertainty,
  monthLength,
  monthStarts,
  sankrantiBy,
  toBengali,
  weekdayOf,
} from './bengaliDate'

/*
 * The first day of each month by drikpanchang for Kolkata (Bisuddha Siddhanta), read off its
 * month grids in October 2026. Gupta Press puts about a third of these a day later; see
 * src/app/bengaliYear.ts.
 */
const PUBLISHED: Record<number, string[]> = {
  1431: ['2024-04-14', '2024-05-15', '2024-06-16', '2024-07-17', '2024-08-17', '2024-09-17', '2024-10-18', '2024-11-17', '2024-12-16', '2025-01-15', '2025-02-13', '2025-03-15', '2025-04-15'],
  1432: ['2025-04-15', '2025-05-16', '2025-06-16', '2025-07-17', '2025-08-18', '2025-09-18', '2025-10-18', '2025-11-17', '2025-12-17', '2026-01-15', '2026-02-14', '2026-03-16', '2026-04-15'],
  1433: ['2026-04-15', '2026-05-16', '2026-06-16', '2026-07-17', '2026-08-18', '2026-09-18', '2026-10-18', '2026-11-17', '2026-12-17', '2027-01-15', '2027-02-14', '2027-03-16', '2027-04-15'],
  1434: ['2027-04-15', '2027-05-16', '2027-06-16', '2027-07-18', '2027-08-18', '2027-09-18', '2027-10-19', '2027-11-18', '2027-12-17', '2028-01-16', '2028-02-14', '2028-03-15', '2028-04-14'],
}

/*
 * The first day of each month by the Gupta Press almanac: 1433 as printed (see PRINTED_SURYA_MONTHS),
 * and 1434 as the Surya Siddhanta sums it until the almanac is out.
 */
const SURYA: Record<number, string[]> = {
  1433: ['2026-04-15', '2026-05-16', '2026-06-16', '2026-07-18', '2026-08-19', '2026-09-19', '2026-10-19', '2026-11-18', '2026-12-17', '2027-01-16', '2027-02-14', '2027-03-16', '2027-04-15'],
  1434: ['2027-04-15', '2027-05-16', '2027-06-17', '2027-07-18', '2027-08-19', '2027-09-19', '2027-10-19', '2027-11-18', '2027-12-18', '2028-01-16', '2028-02-14', '2028-03-15', '2028-04-15'],
}

describe('the West Bengal calendar', () => {
  it.each(Object.entries(PUBLISHED))('agrees with the panjika on every month of %s', (year, starts) => {
    expect(monthStarts(Number(year))).toEqual(starts)
  })

  it('starts Shrabon 1433 the day after a sankranti a quarter of an hour before midnight', () => {
    // Karka sankranti at 23:45 IST on 16 July 2026: still the 16th in Kolkata.
    expect(toBengali('2026-07-16')).toEqual({ year: 1433, month: 2, day: 31 })
    expect(toBengali('2026-07-17')).toEqual({ year: 1433, month: 3, day: 1 })
  })

  it('starts 1433 on 15 April 2026, a day after Bangladesh', () => {
    expect(monthStarts(1433)[0]).toBe('2026-04-15')
    expect(toBengali('2026-04-15')).toEqual({ year: 1433, month: 0, day: 1 })
    // The day before is the last of Choitro, and of the year before.
    expect(toBengali('2026-04-14')).toEqual({ year: 1432, month: 11, day: 30 })
  })

  it('reads Maha Ashtami 2026 as 2 Kartik 1433', () => {
    const date = toBengali('2026-10-19')
    expect(formatBengaliDate(date)).toBe('২ কার্তিক ১৪৩৩')
    expect(formatBengaliDateInEnglish(date)).toBe('2 Kartik 1433')
  })

  it('gives months of 29 to 32 days that add up to the solar year', () => {
    for (const year of [1430, 1431, 1432, 1433, 1434, 1435]) {
      const lengths = Array.from({ length: 12 }, (_, m) => monthLength(year, m))
      for (const length of lengths) expect(length).toBeGreaterThanOrEqual(29)
      for (const length of lengths) expect(length).toBeLessThanOrEqual(32)
      expect([365, 366]).toContain(lengths.reduce((a, b) => a + b, 0))
      // The summer months are the long ones: the sun moves slowest in Joishtho and Asharh.
      expect(lengths[1] + lengths[2]).toBeGreaterThan(lengths[9] + lengths[10])
    }
  })

  it('goes there and back for every day of a year', () => {
    let iso = monthStarts(1433)[0]
    for (let i = 0; i < 400; i++) {
      expect(fromBengali(toBengali(iso))).toBe(iso)
      iso = addCivilDays(iso, 1)
    }
  })

  it('counts the days of a month on without gaps', () => {
    const starts = monthStarts(1433)
    for (let m = 0; m < 12; m++) {
      const last = addCivilDays(starts[m + 1], -1)
      expect(toBengali(last)).toEqual({ year: 1433, month: m, day: monthLength(1433, m) })
    }
  })
})

describe('the Gupta Press calendar, by the Surya Siddhanta', () => {
  it.each(Object.entries(SURYA))('starts each month of %s where the almanac does', (year, starts) => {
    expect(monthStarts(Number(year), 'surya')).toEqual(starts)
  })

  it('takes the print over the sums where they part: Bhadro and Ashwin 1433', () => {
    // The sums put both sankrantis just before midnight, so the months a day early; the almanac
    // starts them on the 19th.
    const kolkata = (at: Date) => new Date(at.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 16)
    expect(kolkata(sankrantiBy('surya', 1433, 4))).toBe('2026-08-17T23:11')
    expect(kolkata(sankrantiBy('surya', 1433, 5))).toBe('2026-09-17T23:39')
    expect(monthStarts(1433, 'surya')[4]).toBe('2026-08-19')
    expect(monthStarts(1433, 'surya')[5]).toBe('2026-09-19')
  })

  it('starts 1 Ashwin 1432 on 18 September 2025, as Gupta Press did', () => {
    expect(monthStarts(1432, 'surya')[5]).toBe('2025-09-18')
  })

  it('knows which months are printed, which are summed, and which are close to call', () => {
    expect(monthCertainty(1433, 6, 'surya')).toBe('printed')
    expect(monthCertainty(1434, 0, 'surya')).toBe('worked-out')
    // Choitro 1434 ends with a Mesha sankranti a quarter of an hour after midnight.
    expect(monthCertainty(1434, 11, 'surya')).toBe('close')
    expect(monthCertainty(1434, 11, 'bisuddha')).toBe('printed')
  })

  it('starts a month on the same day as the Bisuddha Siddhanta, or a day after', () => {
    for (const year of [1430, 1431, 1432, 1433, 1434, 1435]) {
      const surya = monthStarts(year, 'surya')
      monthStarts(year).forEach((bisuddha, m) => expect([0, 1]).toContain(civilDaysBetween(bisuddha, surya[m])))
    }
  })

  it('puts Kartik 1433 a day later: 3 Kartik by Bisuddha is 2 Kartik by Gupta Press', () => {
    expect(toBengali('2026-10-20')).toEqual({ year: 1433, month: 6, day: 3 })
    expect(toBengali('2026-10-20', 'surya')).toEqual({ year: 1433, month: 6, day: 2 })
    // The almanac, as Gupta Press is quoted: 18 October is 30 Ashwin.
    expect(toBengali('2026-10-18', 'surya')).toEqual({ year: 1433, month: 5, day: 30 })
  })

  it('has its sankranti later than the Bisuddha Siddhanta’s, by up to a day', () => {
    for (let m = 0; m < 12; m++) {
      const hours = (sankrantiBy('surya', 1433, m).getTime() - sankrantiBy('bisuddha', 1433, m).getTime()) / 3_600_000
      expect(hours).toBeGreaterThan(0)
      expect(hours).toBeLessThan(26)
    }
  })

  it('gives months of 29 to 32 days, and goes there and back for every day of a year', () => {
    for (let m = 0; m < 12; m++) expect([29, 30, 31, 32]).toContain(monthLength(1433, m, 'surya'))
    let iso = monthStarts(1433, 'surya')[0]
    for (let i = 0; i < 400; i++) {
      expect(fromBengali(toBengali(iso, 'surya'), 'surya')).toBe(iso)
      iso = addCivilDays(iso, 1)
    }
  })
})

describe('civil dates', () => {
  it('knows the weekday, Sunday first', () => {
    expect(weekdayOf('2026-10-18')).toBe(0)
    expect(weekdayOf('2026-10-19')).toBe(1)
    expect(weekdayOf('1970-01-01')).toBe(4)
  })

  it('reads today where the reader is', () => {
    expect(civilDate(new Date(2026, 9, 19, 0, 15))).toBe('2026-10-19')
  })

  it('crosses months and years', () => {
    expect(addCivilDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addCivilDays('2028-03-01', -1)).toBe('2028-02-29')
  })
})

describe('bengaliDigits', () => {
  it('writes numbers in Bengali digits', () => {
    expect(bengaliDigits(1433)).toBe('১৪৩৩')
    expect(bengaliDigits(30)).toBe('৩০')
  })
})
