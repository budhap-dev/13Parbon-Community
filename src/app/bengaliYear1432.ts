import type { Ritual, RitualDay, RitualTime } from '@/domain/ritual'
import { year1433 } from './bengaliYear1433'

/**
 * 1432, from 15 April 2025 to 14 April 2026. It ends with Charak: 1433's Poila Boishakh, the
 * day after, is the first entry of 1433's own file.
 *
 * Taken from drikpanchang set to Kolkata, in October 2026, after the year was over, and checked
 * against the West Bengal holiday notifications 4712-F(P2) for 2025 and 4188-F(P2) for 2026:
 * every puja in them is on the same day here. The month starts and every sankranti day agree
 * with the calendar's own reckoning, which the tests hold them to.
 *
 * Every time was read off drikpanchang; none was worked out. The tithi times were each checked
 * against the sun and moon by PyEphem, and all agree to within two minutes.
 *
 * Less sure than the rest, where the panjikas may not agree:
 * - Janmashtami on 16 August: drikpanchang's, as Ashtami had not begun by midnight on the 15th.
 *   The state first listed the 15th, then moved its holiday to the 16th by 3037-F(P2).
 * - Rash Purnima on 5 November: the Purnima at sunrise; it began late the night before.
 * - Dol on 3 March, the Purnima at sunrise and the state's holiday; it began the evening before.
 * - Ram Navami on 26 March, by drikpanchang and the state's holiday, as Navami holds at midday;
 *   Basanti Puja's Navami, by sunrise, is the 27th, the day ISKCON keeps Ram Navami.
 */

/** The names and what it is, which do not change from year to year: only the dates do. */
function like(id: string): Pick<Ritual, 'id' | 'name' | 'bengaliName' | 'kind' | 'description' | 'bengaliDate'> {
  const { name, bengaliName, kind, description, bengaliDate } = year1433.find((ritual) => ritual.id === id)!
  return { id, name, bengaliName, kind, description, bengaliDate }
}

const ist = (at: string) => `${at}+05:30`
const span = (label: string, from: string, to: string): RitualTime => ({ label, from: ist(from), to: ist(to) })
const moment = (label: string, at: string): RitualTime => ({ label, from: ist(at) })
const day = (date: string, name: string, bengaliName: string): RitualDay => ({ date, name, bengaliName })

export const year1432: Ritual[] = [
  {
    ...like('poila-boishakh'),
    description: 'The Bengali New Year, 1432. New clothes, a visit to the temple, sweets, and shopkeepers opening the year’s new account books.',
    date: '2025-04-15',
    times: [moment('Mesha sankranti, the day before', '2025-04-14T03:30')],
  },
  {
    ...like('akshaya-tritiya'),
    date: '2025-04-30',
    times: [span('Tritiya tithi', '2025-04-29T17:31', '2025-04-30T14:12'), span('Puja muhurat', '2025-04-30T05:05', '2025-04-30T11:34')],
  },
  { ...like('rabindra-jayanti'), date: '2025-05-09' },
  { ...like('nazrul-jayanti'), date: '2025-05-26' },
  {
    ...like('jamai-shashthi'),
    date: '2025-06-01',
    times: [span('Shashthi tithi', '2025-05-31T20:15', '2025-06-01T19:59')],
  },
  {
    ...like('snan-yatra'),
    date: '2025-06-11',
    times: [span('Purnima tithi', '2025-06-10T11:35', '2025-06-11T13:13')],
  },
  {
    ...like('rath-yatra'),
    date: '2025-06-27',
    times: [span('Dwitiya tithi', '2025-06-26T13:24', '2025-06-27T11:19')],
  },
  {
    ...like('ulto-rath'),
    date: '2025-07-05',
    times: [span('Dashami tithi', '2025-07-04T16:31', '2025-07-05T18:58')],
  },
  {
    ...like('jhulan'),
    // From Ekadashi, at sunrise on the 5th, to the full moon.
    date: '2025-08-05',
    until: '2025-08-09',
    days: [day('2025-08-09', 'Jhulan Purnima and Rakhi', 'ঝুলন পূর্ণিমা')],
    times: [span('Purnima tithi', '2025-08-08T14:12', '2025-08-09T13:24'), span('Rakhi', '2025-08-09T05:11', '2025-08-09T13:24')],
  },
  {
    ...like('janmashtami'),
    date: '2025-08-16',
    times: [span('Ashtami tithi', '2025-08-15T23:49', '2025-08-16T21:34'), span('Nishita puja', '2025-08-16T23:19', '2025-08-17T00:03')],
  },
  {
    ...like('manasa-puja'),
    date: '2025-08-17',
    times: [moment('Simha sankranti', '2025-08-17T02:00')],
  },
  {
    ...like('vishwakarma-puja'),
    date: '2025-09-17',
    times: [moment('Kanya sankranti', '2025-09-17T01:55')],
  },
  {
    ...like('mahalaya'),
    date: '2025-09-21',
    times: [span('Amavasya tithi', '2025-09-21T00:16', '2025-09-22T01:23')],
  },
  {
    ...like('durga-puja'),
    date: '2025-09-28',
    until: '2025-10-02',
    days: [
      day('2025-09-28', 'Maha Shashthi', 'মহাষষ্ঠী'),
      day('2025-09-29', 'Maha Saptami', 'মহাসপ্তমী'),
      day('2025-09-30', 'Maha Ashtami', 'মহাষ্টমী'),
      day('2025-10-01', 'Maha Navami', 'মহানবমী'),
      day('2025-10-02', 'Bijoya Dashami', 'বিজয়া দশমী'),
    ],
    times: [
      span('Shashthi tithi', '2025-09-27T12:03', '2025-09-28T14:27'),
      span('Saptami tithi', '2025-09-28T14:27', '2025-09-29T16:31'),
      span('Ashtami tithi', '2025-09-29T16:31', '2025-09-30T18:06'),
      span('Sandhi Puja', '2025-09-30T17:42', '2025-09-30T18:30'),
      span('Navami tithi', '2025-09-30T18:06', '2025-10-01T19:01'),
      span('Dashami tithi', '2025-10-01T19:01', '2025-10-02T19:10'),
      span('Bijoya, aparahna', '2025-10-02T12:37', '2025-10-02T15:00'),
    ],
  },
  {
    ...like('lakshmi-puja'),
    date: '2025-10-06',
    times: [span('Purnima tithi', '2025-10-06T12:23', '2025-10-07T09:16'), span('Nishita puja', '2025-10-06T23:00', '2025-10-06T23:49')],
  },
  {
    ...like('kali-puja'),
    date: '2025-10-20',
    times: [span('Amavasya tithi', '2025-10-20T15:44', '2025-10-21T17:54'), span('Nishita puja', '2025-10-20T22:56', '2025-10-20T23:46')],
  },
  {
    ...like('bhai-phonta'),
    date: '2025-10-23',
    times: [span('Dwitiya tithi', '2025-10-22T20:16', '2025-10-23T22:46'), span('Phonta, aparahna', '2025-10-23T12:30', '2025-10-23T14:47')],
  },
  {
    ...like('jagaddhatri-puja'),
    date: '2025-10-31',
    times: [span('Navami tithi', '2025-10-30T10:06', '2025-10-31T10:03')],
  },
  {
    ...like('rash-purnima'),
    date: '2025-11-05',
    times: [span('Purnima tithi', '2025-11-04T22:36', '2025-11-05T18:48')],
  },
  {
    ...like('kartik-puja'),
    date: '2025-11-16',
    times: [moment('Vrishchika sankranti', '2025-11-16T13:45')],
  },
  { ...like('nabanna'), date: '2025-11-17' },
  {
    ...like('poush-sankranti'),
    date: '2026-01-14',
    times: [moment('Makar sankranti', '2026-01-14T15:13')],
  },
  {
    ...like('saraswati-puja'),
    date: '2026-01-23',
    times: [span('Panchami tithi', '2026-01-23T02:28', '2026-01-24T01:46'), span('Puja muhurat', '2026-01-23T06:18', '2026-01-23T11:48')],
  },
  {
    ...like('shivratri'),
    date: '2026-02-15',
    times: [span('Chaturdashi tithi', '2026-02-15T17:04', '2026-02-16T17:34'), span('Nishita puja', '2026-02-15T23:25', '2026-02-16T00:16')],
  },
  { ...like('bhasha-dibas'), date: '2026-02-21' },
  {
    ...like('dol'),
    date: '2026-03-03',
    times: [span('Purnima tithi', '2026-03-02T17:55', '2026-03-03T17:07')],
  },
  {
    ...like('basanti-puja'),
    date: '2026-03-24',
    until: '2026-03-28',
    days: [
      day('2026-03-24', 'Shashthi', 'ষষ্ঠী'),
      day('2026-03-25', 'Saptami', 'সপ্তমী'),
      day('2026-03-26', 'Ashtami', 'অষ্টমী'),
      day('2026-03-27', 'Navami', 'নবমী'),
      day('2026-03-28', 'Dashami', 'দশমী'),
    ],
    times: [
      span('Shashthi tithi', '2026-03-23T18:38', '2026-03-24T16:07'),
      span('Saptami tithi', '2026-03-24T16:07', '2026-03-25T13:50'),
      span('Ashtami tithi', '2026-03-25T13:50', '2026-03-26T11:48'),
      span('Navami tithi', '2026-03-26T11:48', '2026-03-27T10:06'),
      span('Dashami tithi', '2026-03-27T10:06', '2026-03-28T08:45'),
    ],
  },
  {
    ...like('annapurna-puja'),
    date: '2026-03-26',
    times: [span('Ashtami tithi', '2026-03-25T13:50', '2026-03-26T11:48')],
  },
  {
    ...like('ram-navami'),
    date: '2026-03-26',
    times: [span('Navami tithi', '2026-03-26T11:48', '2026-03-27T10:06'), span('Madhyahna muhurat', '2026-03-26T10:29', '2026-03-26T12:56')],
  },
  { ...like('neel-puja'), date: '2026-04-13' },
  {
    ...like('charak'),
    date: '2026-04-14',
    times: [moment('Mesha sankranti', '2026-04-14T09:39')],
  },
]
