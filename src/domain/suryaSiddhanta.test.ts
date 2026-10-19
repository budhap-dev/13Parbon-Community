import { sankrantiAfter, sunReaches, tithiAfter, tithiAt } from './suryaSiddhanta'

const ist = (at: string) => new Date(`${at}+05:30`)
const minutesBefore = (printed: string, ours: Date) => (ist(printed).getTime() - ours.getTime()) / 60_000

/*
 * Against the Surya Siddhanta panjika as printed for 1433 (see src/app/bengaliYear1433.ts). The
 * sums come out before the print every time: 6 to 15 minutes in June, October and February, and
 * 25 to 31 in July and August, so it moves through the year. Nobody has said why — a meridian, a
 * correction, a different moon — so the page shows printed times and not these.
 */
describe('the Surya Siddhanta', () => {
  it('ends tithis a few minutes before the almanac does', () => {
    const printed: [number, string, string][] = [
      [8, '2026-10-18T00:00', '2026-10-19T07:49'], // Maha Ashtami, Gupta Press
      [30, '2026-11-07T00:00', '2026-11-09T11:27'], // Kali Puja, Benimadhab Sil
      [5, '2027-02-10T00:00', '2027-02-12T00:24'], // Saraswati Puja
      [6, '2026-06-19T00:00', '2026-06-20T20:57'], // Jamai Shashthi
    ]
    for (const [tithi, after, end] of printed) {
      const early = minutesBefore(end, tithiAfter(tithi, ist(after)).to)
      expect(early).toBeGreaterThanOrEqual(6)
      expect(early).toBeLessThanOrEqual(15)
    }
  })

  it('puts the sun into Ardra a quarter of an hour before the almanac’s Ambubachi', () => {
    // Ambubachi begins as the sun enters Ardra, at 66°40′; Benimadhab Sil: 22 June 2026, 9:10 pm.
    const ardra = sunReaches(200 / 3, ist('2026-06-10T00:00'))
    const early = minutesBefore('2026-06-22T21:10', ardra)
    expect(early).toBeGreaterThanOrEqual(13)
    expect(early).toBeLessThanOrEqual(15)
  })

  it('has Maha Ashtami at sunrise on 19 October 2026', () => {
    expect(tithiAt(ist('2026-10-19T05:40'))).toBe(8)
  })

  it('finds the next sankranti, not one a moment before', () => {
    const mesha = sankrantiAfter(0, ist('2026-04-01T00:00'))
    const next = sankrantiAfter(0, new Date(mesha.getTime() + 60_000))
    expect(next.getTime() - mesha.getTime()).toBeGreaterThan(360 * 86_400_000)
  })

  it('puts the Mesha sankranti of 1433 on 14 April 2026, in the morning', () => {
    const at = sankrantiAfter(0, ist('2026-04-01T00:00'))
    expect(at.getTime()).toBeGreaterThan(ist('2026-04-14T06:00').getTime())
    expect(at.getTime()).toBeLessThan(ist('2026-04-14T18:00').getTime())
  })
})

