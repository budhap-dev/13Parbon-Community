import type { Ritual, RitualDay, RitualTime } from '@/domain/ritual'
import { year1433 } from './bengaliYear1433'

/**
 * 1431, from Poila Boishakh on 14 April 2024 to Charak on 14 April 2025. The next Poila
 * Boishakh, 15 April 2025, starts 1432's file.
 *
 * Taken from drikpanchang set to Kolkata, in October 2026, after the year was over, and checked
 * against the West Bengal holiday lists for 2024 and 2025, which agree on every day but one
 * (Durga Puja, below). The month starts and every sankranti day agree with the calendar's own
 * reckoning, which the tests hold them to.
 *
 * drikpanchang put up a robot check partway through, so some tithi times were worked out instead,
 * from the sun and moon by PyEphem, after it had matched thirty-six of drikpanchang's own 2024
 * and 2025 times to within a minute: both ends of Durga Puja's Shashthi, and Basanti Puja's
 * Shashthi, Saptami and the end of its Dashami. Mahalaya's Amavasya and the Purnimas of Rash and
 * Dol were worked out too, and agree with drikpanchang's times as other sites quote them. They
 * are marked below.
 *
 * Less sure than the rest, where the panjikas may not agree:
 * - Durga Puja, 9 to 13 October: by drikpanchang and Belur Math, which kept Navami on the 12th
 *   and Dashami on the 13th. The state's 2024 list, by the older panjika, put Ashtami and Navami
 *   both on the 11th and Dashami on the 12th. Belur Math gives Sandhi Puja a minute later, 11:43
 *   to 12:31.
 * - Ulto Rath on 15 July, as it was kept across Bengal and in Puri, eight days after Rath; by
 *   sunrise alone Dashami holds the 16th, having begun at 7:19 in the evening of the 15th.
 * - Saraswati Puja on 2 February: Panchami begins at 9:14 and holds at sunrise on the 3rd until
 *   6:52, which some almanacs chose; the state gave the 3rd as the day after.
 * - Rash Purnima on 15 November: the Purnima begins just after sunrise and ends before the next.
 * - Manasa, Vishwakarma and Kartik Puja on the Bisuddha sankranti days, 16 August, 16 September
 *   and 16 November; the Surya Siddhanta almanacs may keep some of them a day later.
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

export const year1431: Ritual[] = [
  {
    ...like('poila-boishakh'),
    description: 'The Bengali New Year, 1431. New clothes, a visit to the temple, sweets, and shopkeepers opening the year’s new account books.',
    date: '2024-04-14',
    times: [moment('Mesha sankranti, the day before', '2024-04-13T21:15')],
  },
  { ...like('rabindra-jayanti'), date: '2024-05-08' },
  {
    ...like('akshaya-tritiya'),
    date: '2024-05-10',
    times: [span('Tritiya tithi', '2024-05-10T04:17', '2024-05-11T02:50'), span('Puja muhurat', '2024-05-10T04:59', '2024-05-10T11:33')],
  },
  { ...like('nazrul-jayanti'), date: '2024-05-25' },
  {
    ...like('jamai-shashthi'),
    date: '2024-06-12',
    times: [span('Shashthi tithi', '2024-06-11T17:27', '2024-06-12T19:16')],
  },
  {
    ...like('snan-yatra'),
    date: '2024-06-22',
    times: [span('Purnima tithi', '2024-06-21T07:31', '2024-06-22T06:37')],
  },
  {
    ...like('rath-yatra'),
    date: '2024-07-07',
    times: [span('Dwitiya tithi', '2024-07-07T04:26', '2024-07-08T04:59')],
  },
  {
    ...like('ulto-rath'),
    // Kept on the 15th, eight days after Rath; Dashami begins that evening.
    date: '2024-07-15',
    times: [span('Dashami tithi', '2024-07-15T19:19', '2024-07-16T20:33')],
  },
  {
    ...like('manasa-puja'),
    date: '2024-08-16',
    times: [moment('Simha sankranti', '2024-08-16T19:54')],
  },
  {
    ...like('jhulan'),
    // From Ekadashi, at sunrise on the 16th, to the full moon.
    date: '2024-08-16',
    until: '2024-08-19',
    days: [day('2024-08-19', 'Jhulan Purnima and Rakhi', 'ঝুলন পূর্ণিমা')],
    // Rakhi from the end of Bhadra, as drikpanchang gives it.
    times: [span('Purnima tithi', '2024-08-19T03:04', '2024-08-19T23:55'), span('Rakhi', '2024-08-19T13:30', '2024-08-19T20:19')],
  },
  {
    ...like('janmashtami'),
    date: '2024-08-26',
    times: [span('Ashtami tithi', '2024-08-26T03:39', '2024-08-27T02:19'), span('Nishita puja', '2024-08-26T23:16', '2024-08-27T00:01')],
  },
  {
    ...like('vishwakarma-puja'),
    date: '2024-09-16',
    times: [moment('Kanya sankranti', '2024-09-16T19:53')],
  },
  {
    ...like('mahalaya'),
    date: '2024-10-02',
    // Worked out, and as drikpanchang is quoted.
    times: [span('Amavasya tithi', '2024-10-01T21:39', '2024-10-03T00:18')],
  },
  {
    ...like('durga-puja'),
    date: '2024-10-09',
    until: '2024-10-13',
    days: [
      day('2024-10-09', 'Maha Shashthi', 'মহাষষ্ঠী'),
      day('2024-10-10', 'Maha Saptami', 'মহাসপ্তমী'),
      day('2024-10-11', 'Maha Ashtami', 'মহাষ্টমী'),
      day('2024-10-12', 'Maha Navami', 'মহানবমী'),
      day('2024-10-13', 'Bijoya Dashami', 'বিজয়া দশমী'),
    ],
    /*
     * No Bijoya aparahna: Dashami ends at 9:08 on the morning of the 13th, so the only afternoon
     * it holds is the 12th's, Navami's day.
     */
    times: [
      // Shashthi worked out; the rest read off the panjika.
      span('Shashthi tithi', '2024-10-08T11:18', '2024-10-09T12:14'),
      span('Saptami tithi', '2024-10-09T12:14', '2024-10-10T12:31'),
      span('Ashtami tithi', '2024-10-10T12:31', '2024-10-11T12:06'),
      span('Sandhi Puja', '2024-10-11T11:42', '2024-10-11T12:30'),
      span('Navami tithi', '2024-10-11T12:06', '2024-10-12T10:58'),
      span('Dashami tithi', '2024-10-12T10:58', '2024-10-13T09:08'),
    ],
  },
  {
    ...like('lakshmi-puja'),
    date: '2024-10-16',
    times: [span('Purnima tithi', '2024-10-16T20:40', '2024-10-17T16:55'), span('Nishita puja', '2024-10-16T22:57', '2024-10-16T23:47')],
  },
  {
    ...like('kali-puja'),
    date: '2024-10-31',
    times: [span('Amavasya tithi', '2024-10-31T15:52', '2024-11-01T18:16'), span('Nishita puja', '2024-10-31T22:55', '2024-10-31T23:46')],
  },
  {
    ...like('bhai-phonta'),
    date: '2024-11-03',
    times: [span('Dwitiya tithi', '2024-11-02T20:21', '2024-11-03T22:05'), span('Phonta, aparahna', '2024-11-03T12:27', '2024-11-03T14:43')],
  },
  {
    ...like('jagaddhatri-puja'),
    date: '2024-11-10',
    times: [span('Navami tithi', '2024-11-09T22:45', '2024-11-10T21:01')],
  },
  {
    ...like('rash-purnima'),
    date: '2024-11-15',
    // Worked out, and as drikpanchang is quoted.
    times: [span('Purnima tithi', '2024-11-15T06:19', '2024-11-16T02:58')],
  },
  {
    ...like('kartik-puja'),
    date: '2024-11-16',
    times: [moment('Vrishchika sankranti', '2024-11-16T07:41')],
  },
  { ...like('nabanna'), date: '2024-11-17' },
  {
    ...like('poush-sankranti'),
    date: '2025-01-14',
    times: [moment('Makar sankranti', '2025-01-14T09:03')],
  },
  {
    ...like('saraswati-puja'),
    date: '2025-02-02',
    times: [span('Panchami tithi', '2025-02-02T09:14', '2025-02-03T06:52'), span('Puja muhurat', '2025-02-02T09:14', '2025-02-02T11:50')],
  },
  { ...like('bhasha-dibas'), date: '2025-02-21' },
  {
    ...like('shivratri'),
    date: '2025-02-26',
    times: [span('Chaturdashi tithi', '2025-02-26T11:08', '2025-02-27T08:54'), span('Nishita puja', '2025-02-26T23:24', '2025-02-27T00:14')],
  },
  {
    ...like('dol'),
    date: '2025-03-14',
    // Worked out, and as drikpanchang is quoted.
    times: [span('Purnima tithi', '2025-03-13T10:35', '2025-03-14T12:23')],
  },
  {
    ...like('basanti-puja'),
    date: '2025-04-03',
    until: '2025-04-07',
    days: [
      day('2025-04-03', 'Shashthi', 'ষষ্ঠী'),
      day('2025-04-04', 'Saptami', 'সপ্তমী'),
      day('2025-04-05', 'Ashtami', 'অষ্টমী'),
      day('2025-04-06', 'Navami', 'নবমী'),
      day('2025-04-07', 'Dashami', 'দশমী'),
    ],
    times: [
      // Shashthi, Saptami and the end of Dashami worked out; Navami read off the panjika.
      span('Shashthi tithi', '2025-04-02T23:49', '2025-04-03T21:41'),
      span('Saptami tithi', '2025-04-03T21:41', '2025-04-04T20:12'),
      span('Ashtami tithi', '2025-04-04T20:12', '2025-04-05T19:26'),
      span('Navami tithi', '2025-04-05T19:26', '2025-04-06T19:22'),
      span('Dashami tithi', '2025-04-06T19:22', '2025-04-07T20:00'),
    ],
  },
  {
    ...like('annapurna-puja'),
    date: '2025-04-05',
    // Its start worked out; its end read off the panjika.
    times: [span('Ashtami tithi', '2025-04-04T20:12', '2025-04-05T19:26')],
  },
  {
    ...like('ram-navami'),
    date: '2025-04-06',
    times: [span('Navami tithi', '2025-04-05T19:26', '2025-04-06T19:22'), span('Madhyahna muhurat', '2025-04-06T10:24', '2025-04-06T12:54')],
  },
  { ...like('neel-puja'), date: '2025-04-13' },
  {
    ...like('charak'),
    date: '2025-04-14',
    times: [moment('Mesha sankranti', '2025-04-14T03:30')],
  },
]
