import type { Ritual, RitualDay, RitualTime } from '@/domain/ritual'
import { durgaPuja, year1433 } from './bengaliYear1433'

/**
 * 1434, from 15 April 2027 to 13 April 2028, and the first day of 1435.
 *
 * Taken from drikpanchang set to Kolkata, in October 2026 — ahead of the West Bengal holiday
 * lists for 2027 and 2028, so check it against each when it is out. The month starts and every
 * sankranti day agree with the calendar's own reckoning, which the tests hold them to.
 *
 * Five tithi times drikpanchang would not give without a robot check were worked out instead,
 * from the sun and moon by PyEphem, after it had matched eleven of drikpanchang's own 2027 and
 * 2028 times to within two minutes: Dashami for Ulto Rath, the start of Shashthi for Durga Puja,
 * and Shashthi, Saptami and Dashami for Basanti Puja. They are marked below.
 *
 * Less sure than the rest, where the panjikas may not agree:
 * - Janmashtami on 25 August: drikpanchang's, by Rohini at midnight, after Ashtami has ended.
 * - Rash Purnima on 14 November: the Purnima at sunrise; it began the morning before.
 * - Saraswati Puja on 31 January: Panchami begins at 7:14, after sunrise, and holds the morning
 *   of 1 February too, which some almanacs will choose.
 * - Ram Navami on 3 April, by drikpanchang; Basanti Puja's Navami, by sunrise, is the 4th.
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

export const year1434: Ritual[] = [
  {
    ...like('akshaya-tritiya'),
    date: '2027-05-09',
    times: [span('Tritiya tithi', '2027-05-08T11:42', '2027-05-09T09:03'), span('Puja muhurat', '2027-05-09T05:00', '2027-05-09T09:03')],
  },
  { ...like('rabindra-jayanti'), date: '2027-05-09' },
  { ...like('nazrul-jayanti'), date: '2027-05-26' },
  {
    ...like('jamai-shashthi'),
    date: '2027-06-10',
    times: [span('Shashthi tithi', '2027-06-09T09:35', '2027-06-10T07:11')],
  },
  {
    ...like('snan-yatra'),
    date: '2027-06-18',
    times: [span('Purnima tithi', '2027-06-18T04:34', '2027-06-19T06:13')],
  },
  {
    ...like('rath-yatra'),
    date: '2027-07-05',
    times: [span('Dwitiya tithi', '2027-07-05T04:50', '2027-07-06T01:13')],
  },
  {
    ...like('ulto-rath'),
    date: '2027-07-13',
    // Worked out, not read off the panjika.
    times: [span('Dashami tithi', '2027-07-12T11:40', '2027-07-13T12:08')],
  },
  {
    ...like('manasa-puja'),
    date: '2027-08-17',
    times: [moment('Simha sankranti', '2027-08-17T14:16')],
  },
  {
    ...like('jhulan'),
    // From Ekadashi, at sunrise on the 12th, to the full moon.
    date: '2027-08-12',
    until: '2027-08-17',
    days: [day('2027-08-17', 'Jhulan Purnima and Rakhi', 'ঝুলন পূর্ণিমা')],
    times: [span('Purnima tithi', '2027-08-16T10:28', '2027-08-17T12:58'), span('Rakhi', '2027-08-17T05:14', '2027-08-17T12:58')],
  },
  {
    ...like('janmashtami'),
    date: '2027-08-25',
    times: [span('Ashtami tithi', '2027-08-24T20:24', '2027-08-25T19:19'), span('Nishita puja', '2027-08-25T23:16', '2027-08-26T00:01')],
  },
  {
    ...like('vishwakarma-puja'),
    date: '2027-09-17',
    times: [moment('Kanya sankranti', '2027-09-17T14:14')],
  },
  {
    ...like('mahalaya'),
    date: '2027-09-29',
    times: [span('Amavasya tithi', '2027-09-29T10:54', '2027-09-30T08:05')],
  },
  {
    ...like('durga-puja'),
    description: durgaPuja.replace('Five days of the goddess’s visit home', 'Six days of the goddess’s visit home this year'),
    date: '2027-10-05',
    until: '2027-10-10',
    /*
     * Six days, not five: Ashtami holds at sunrise on the 8th until 6:27, so Navami is kept on
     * the 9th and the 8th is the day of Sandhi Puja, where the one becomes the other.
     */
    days: [
      day('2027-10-05', 'Maha Shashthi', 'মহাষষ্ঠী'),
      day('2027-10-06', 'Maha Saptami', 'মহাসপ্তমী'),
      day('2027-10-07', 'Maha Ashtami', 'মহাষ্টমী'),
      day('2027-10-08', 'Sandhi Puja', 'সন্ধিপূজা'),
      day('2027-10-09', 'Maha Navami', 'মহানবমী'),
      day('2027-10-10', 'Bijoya Dashami', 'বিজয়া দশমী'),
    ],
    times: [
      // Shashthi's start worked out; the rest read off the panjika.
      span('Shashthi tithi', '2027-10-05T01:36', '2027-10-06T02:32'),
      span('Saptami tithi', '2027-10-06T02:32', '2027-10-07T04:13'),
      span('Ashtami tithi', '2027-10-07T04:13', '2027-10-08T06:27'),
      span('Sandhi Puja', '2027-10-08T06:03', '2027-10-08T06:51'),
      span('Navami tithi', '2027-10-08T06:27', '2027-10-09T09:01'),
      span('Dashami tithi', '2027-10-09T09:01', '2027-10-10T11:40'),
      span('Bijoya, aparahna', '2027-10-10T12:34', '2027-10-10T14:55'),
    ],
  },
  {
    ...like('lakshmi-puja'),
    date: '2027-10-14',
    times: [span('Purnima tithi', '2027-10-14T18:49', '2027-10-15T19:16'), span('Nishita puja', '2027-10-14T22:58', '2027-10-14T23:47')],
  },
  {
    ...like('kali-puja'),
    date: '2027-10-28',
    times: [span('Amavasya tithi', '2027-10-28T20:47', '2027-10-29T19:05'), span('Nishita puja', '2027-10-28T22:55', '2027-10-28T23:46')],
  },
  {
    ...like('bhai-phonta'),
    date: '2027-10-31',
    times: [span('Dwitiya tithi', '2027-10-30T17:51', '2027-10-31T17:12'), span('Phonta, aparahna', '2027-10-31T12:28', '2027-10-31T14:44')],
  },
  {
    ...like('jagaddhatri-puja'),
    date: '2027-11-07',
    times: [span('Navami tithi', '2027-11-07T02:49', '2027-11-08T05:23')],
  },
  {
    ...like('rash-purnima'),
    date: '2027-11-14',
    times: [span('Purnima tithi', '2027-11-13T09:55', '2027-11-14T08:55')],
  },
  {
    ...like('kartik-puja'),
    date: '2027-11-17',
    times: [moment('Vrishchika sankranti', '2027-11-17T02:02')],
  },
  { ...like('nabanna'), date: '2027-11-18' },
  {
    ...like('poush-sankranti'),
    date: '2028-01-15',
    times: [moment('Makar sankranti', '2028-01-15T03:26')],
  },
  {
    ...like('saraswati-puja'),
    date: '2028-01-31',
    times: [span('Panchami tithi', '2028-01-31T07:14', '2028-02-01T09:27'), span('Puja muhurat', '2028-01-31T07:14', '2028-01-31T11:50')],
  },
  { ...like('bhasha-dibas'), date: '2028-02-21' },
  {
    ...like('shivratri'),
    date: '2028-02-23',
    times: [span('Chaturdashi tithi', '2028-02-23T10:44', '2028-02-24T13:26'), span('Nishita puja', '2028-02-23T23:25', '2028-02-24T00:15')],
  },
  {
    ...like('dol'),
    date: '2028-03-11',
    times: [span('Purnima tithi', '2028-03-10T10:20', '2028-03-11T06:35')],
  },
  {
    ...like('basanti-puja'),
    date: '2028-04-01',
    until: '2028-04-05',
    days: [
      day('2028-04-01', 'Shashthi', 'ষষ্ঠী'),
      day('2028-04-02', 'Saptami', 'সপ্তমী'),
      day('2028-04-03', 'Ashtami', 'অষ্টমী'),
      day('2028-04-04', 'Navami', 'নবমী'),
      day('2028-04-05', 'Dashami', 'দশমী'),
    ],
    times: [
      // Shashthi, Saptami and Dashami worked out; Ashtami and Navami read off the panjika.
      span('Shashthi tithi', '2028-03-31T14:35', '2028-04-01T14:13'),
      span('Saptami tithi', '2028-04-01T14:13', '2028-04-02T13:22'),
      span('Ashtami tithi', '2028-04-02T13:22', '2028-04-03T11:59'),
      span('Navami tithi', '2028-04-03T11:59', '2028-04-04T10:07'),
      span('Dashami tithi', '2028-04-04T10:07', '2028-04-05T07:45'),
    ],
  },
  {
    ...like('annapurna-puja'),
    date: '2028-04-03',
    times: [span('Ashtami tithi', '2028-04-02T13:22', '2028-04-03T11:59')],
  },
  {
    ...like('ram-navami'),
    date: '2028-04-03',
    times: [span('Navami tithi', '2028-04-03T11:59', '2028-04-04T10:07'), span('Madhyahna muhurat', '2028-04-03T10:25', '2028-04-03T12:54')],
  },
  { ...like('neel-puja'), date: '2028-04-12' },
  {
    ...like('charak'),
    date: '2028-04-13',
    times: [moment('Mesha sankranti', '2028-04-13T21:47')],
  },
  {
    ...like('poila-boishakh'),
    description: 'The Bengali New Year, 1435. New clothes, a visit to the temple, sweets, and shopkeepers opening the year’s new account books.',
    date: '2028-04-14',
    times: [moment('Mesha sankranti, the day before', '2028-04-13T21:47')],
  },
]
