import type { Ritual, RitualDay, RitualTime } from '@/domain/ritual'
import { year1433 } from './bengaliYear1433'

/**
 * 1435, from 14 April 2028 to 14 April 2029, and the first day of 1436.
 *
 * Taken from drikpanchang set to Kolkata, in October 2026 — ahead of the West Bengal holiday
 * lists for 2028 and 2029, so check it against each when it is out. Every time here was read off
 * its festival, sankranti and daily panchang pages; none had to be worked out. The month starts
 * and every sankranti day agree with the calendar's own reckoning, which the tests hold them to,
 * and with drikpanchang's Bengali month pages.
 *
 * No Basanti Puja, Annapurna Puja or Ram Navami this year. 2029 has an extra lunar month, Adhik
 * Chaitra, from the new moon of 15 March to that of 14 April. The first comes after the sun
 * enters Meena, at 19:24 on 14 March, and the second, at 3:09, 47 minutes before it enters
 * Mesha, so the month has no sankranti of its own. The spring
 * Navaratri is kept in the true Chaitra after it, in Boishakh 1436: Ram Navami on 23 April 2029.
 *
 * Less sure than the rest, where the panjikas may not agree:
 * - Jamai Shashthi on 29 May: Shashthi is lost this year, beginning at 6:25 after sunrise and
 *   ending at 4:21 the next morning before it. Drikpanchang keeps it on the day it begins.
 * - Rash Purnima on 2 November: the Purnima at sunrise; it began at 1:07 the afternoon before.
 * - Saraswati Puja on 19 January: Panchami holds both sunrises, the 19th from 4:16 and the 20th
 *   until 6:39, twenty minutes after it. Drikpanchang keeps the 19th, by the morning.
 * - Charak on 14 April 2029: the Mesha sankranti is at 3:56 that morning, after midnight, so
 *   Choitro ends on the 14th and 1436 begins on the 15th, as drikpanchang has it.
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

export const year1435: Ritual[] = [
  {
    ...like('akshaya-tritiya'),
    date: '2028-04-27',
    times: [span('Tritiya tithi', '2028-04-27T01:47', '2028-04-28T01:27'), span('Puja muhurat', '2028-04-27T05:07', '2028-04-27T11:34')],
  },
  { ...like('rabindra-jayanti'), date: '2028-05-08' },
  { ...like('nazrul-jayanti'), date: '2028-05-25' },
  {
    ...like('jamai-shashthi'),
    date: '2028-05-29',
    times: [span('Shashthi tithi', '2028-05-29T06:25', '2028-05-30T04:21')],
  },
  {
    ...like('snan-yatra'),
    date: '2028-06-07',
    times: [span('Purnima tithi', '2028-06-06T12:29', '2028-06-07T11:38')],
  },
  {
    ...like('rath-yatra'),
    date: '2028-06-24',
    times: [span('Dwitiya tithi', '2028-06-23T21:51', '2028-06-24T19:28')],
  },
  {
    ...like('ulto-rath'),
    date: '2028-07-01',
    times: [span('Dashami tithi', '2028-07-01T02:46', '2028-07-02T01:14')],
  },
  {
    ...like('jhulan'),
    // From Ekadashi, at sunrise on the 1st, to the full moon.
    date: '2028-08-01',
    until: '2028-08-05',
    days: [day('2028-08-05', 'Jhulan Purnima and Rakhi', 'ঝুলন পূর্ণিমা')],
    times: [span('Purnima tithi', '2028-08-04T11:51', '2028-08-05T13:39'), span('Rakhi', '2028-08-05T05:10', '2028-08-05T13:39')],
  },
  {
    ...like('janmashtami'),
    date: '2028-08-13',
    times: [span('Ashtami tithi', '2028-08-13T04:42', '2028-08-14T05:36'), span('Nishita puja', '2028-08-13T23:19', '2028-08-14T00:03')],
  },
  {
    ...like('manasa-puja'),
    date: '2028-08-16',
    times: [moment('Simha sankranti', '2028-08-16T20:30')],
  },
  {
    ...like('vishwakarma-puja'),
    date: '2028-09-16',
    times: [moment('Kanya sankranti', '2028-09-16T20:23')],
  },
  {
    ...like('mahalaya'),
    date: '2028-09-18',
    times: [span('Amavasya tithi', '2028-09-18T03:46', '2028-09-18T23:53')],
  },
  {
    ...like('durga-puja'),
    date: '2028-09-24',
    until: '2028-09-28',
    days: [
      day('2028-09-24', 'Maha Shashthi', 'মহাষষ্ঠী'),
      day('2028-09-25', 'Maha Saptami', 'মহাসপ্তমী'),
      day('2028-09-26', 'Maha Ashtami', 'মহাষ্টমী'),
      day('2028-09-27', 'Maha Navami', 'মহানবমী'),
      day('2028-09-28', 'Bijoya Dashami', 'বিজয়া দশমী'),
    ],
    times: [
      span('Shashthi tithi', '2028-09-23T08:11', '2028-09-24T06:56'),
      span('Saptami tithi', '2028-09-24T06:56', '2028-09-25T06:32'),
      span('Ashtami tithi', '2028-09-25T06:32', '2028-09-26T06:58'),
      span('Sandhi Puja', '2028-09-26T06:34', '2028-09-26T07:22'),
      span('Navami tithi', '2028-09-26T06:58', '2028-09-27T08:08'),
      span('Dashami tithi', '2028-09-27T08:08', '2028-09-28T09:55'),
      span('Bijoya, aparahna', '2028-09-28T12:39', '2028-09-28T15:03'),
    ],
  },
  {
    ...like('lakshmi-puja'),
    date: '2028-10-02',
    times: [span('Purnima tithi', '2028-10-02T19:33', '2028-10-03T21:54'), span('Nishita puja', '2028-10-02T23:02', '2028-10-02T23:50')],
  },
  {
    ...like('kali-puja'),
    date: '2028-10-17',
    times: [span('Amavasya tithi', '2028-10-17T12:04', '2028-10-18T08:26'), span('Nishita puja', '2028-10-17T22:57', '2028-10-17T23:47')],
  },
  {
    ...like('bhai-phonta'),
    date: '2028-10-19',
    times: [span('Dwitiya tithi', '2028-10-19T05:00', '2028-10-20T01:58'), span('Phonta, aparahna', '2028-10-19T12:31', '2028-10-19T14:49')],
  },
  {
    ...like('jagaddhatri-puja'),
    date: '2028-10-26',
    times: [span('Navami tithi', '2028-10-25T23:13', '2028-10-27T01:19')],
  },
  {
    ...like('rash-purnima'),
    date: '2028-11-02',
    times: [span('Purnima tithi', '2028-11-01T13:07', '2028-11-02T14:46')],
  },
  {
    ...like('kartik-puja'),
    date: '2028-11-16',
    times: [moment('Vrishchika sankranti', '2028-11-16T08:04')],
  },
  { ...like('nabanna'), date: '2028-11-17' },
  {
    ...like('poush-sankranti'),
    date: '2029-01-14',
    times: [moment('Makar sankranti', '2029-01-14T09:28')],
  },
  {
    ...like('saraswati-puja'),
    date: '2029-01-19',
    times: [span('Panchami tithi', '2029-01-19T04:16', '2029-01-20T06:39'), span('Puja muhurat', '2029-01-19T06:19', '2029-01-19T11:47')],
  },
  {
    ...like('shivratri'),
    date: '2029-02-11',
    times: [span('Chaturdashi tithi', '2029-02-11T13:29', '2029-02-12T14:34'), span('Nishita puja', '2029-02-11T23:25', '2029-02-12T00:16')],
  },
  { ...like('bhasha-dibas'), date: '2029-02-21' },
  {
    ...like('dol'),
    date: '2029-02-28',
    times: [span('Purnima tithi', '2029-02-28T02:04', '2029-02-28T22:39')],
  },
  { ...like('neel-puja'), date: '2029-04-13' },
  {
    ...like('charak'),
    date: '2029-04-14',
    times: [moment('Mesha sankranti', '2029-04-14T03:56')],
  },
  {
    ...like('poila-boishakh'),
    description: 'The Bengali New Year, 1436. New clothes, a visit to the temple, sweets, and shopkeepers opening the year’s new account books.',
    date: '2029-04-15',
    times: [moment('Mesha sankranti, the day before', '2029-04-14T03:56')],
  },
]
