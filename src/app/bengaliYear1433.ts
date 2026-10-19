import type { Ritual } from '@/domain/ritual'

/**
 * 1433, from 15 April 2026 to 14 April 2027, and the first day of 1434.
 *
 * Taken from the West Bengal holiday notification 4188-F(P2) for 2026 and from drikpanchang set
 * to Kolkata, in October 2026. January to April 2027 rests on drikpanchang alone until the
 * state's 2027 list is out; check those against it when it is.
 *
 * The `guptaPress` dates and times are the Surya Siddhanta panjika's, read in October 2026 from
 * the Benimadhab Sil text at benimadhabsilpanjika.com and the Gupta Press times quoted in Aaj Tak
 * Bangla, TV9 Bangla, Sangbad Pratidin and Asianet Bangla; the two almanacs agree on the days and
 * to a minute or two on the times. A time printed for the night ("রাত্রি ঘ ১২।৪৪" on 26 Magh) is
 * after midnight, the next civil day, as here. Rath Yatra and Janmashtami have their dates only:
 * the times quoted for them did not hang together. The pujas without one were not found in print.
 */
export const durgaPuja =
  'Five days of the goddess’s visit home: anjali in the morning, bhog at lunchtime, arati and dhunuchi at dusk, and sindoor khela before she leaves.'

export const year1433: Ritual[] = [
  {
    id: 'poila-boishakh',
    name: 'Poila Boishakh',
    bengaliName: 'পয়লা বৈশাখ',
    kind: 'festival',
    bengaliDate: { month: 0, day: 1 },
    date: '2026-04-15',
    description: 'The Bengali New Year, 1433. New clothes, a visit to the temple, sweets, and shopkeepers opening the year’s new account books.',
    times: [
      { label: 'Mesha sankranti, the day before', from: '2026-04-14T09:39+05:30' },
    ],
  },
  {
    id: 'akshaya-tritiya',
    name: 'Akshaya Tritiya',
    bengaliName: 'অক্ষয় তৃতীয়া',
    kind: 'festival',
    date: '2026-04-19',
    description: 'A day for beginnings that last. Many Bengali traders keep their haal khata today, with a puja to Ganesh and Lakshmi.',
    times: [
      { label: 'Tritiya tithi', from: '2026-04-19T10:49+05:30', to: '2026-04-20T07:27+05:30' },
      { label: 'Puja muhurat', from: '2026-04-19T10:49+05:30', to: '2026-04-19T11:36+05:30' },
    ],
  },
  {
    id: 'rabindra-jayanti',
    name: 'Rabindra Jayanti',
    bengaliName: 'রবীন্দ্র জয়ন্তী',
    kind: 'cultural',
    bengaliDate: { month: 0, day: 25 },
    date: '2026-05-09',
    description: 'Pochishe Boishakh, Rabindranath Tagore’s birthday by the Bengali calendar. Morning songs, recitation and dance drama.',
  },
  {
    id: 'nazrul-jayanti',
    name: 'Nazrul Jayanti',
    bengaliName: 'নজরুল জয়ন্তী',
    kind: 'cultural',
    bengaliDate: { month: 1, day: 11 },
    date: '2026-05-26',
    description: 'Egaroi Joishtho, the birthday of Kazi Nazrul Islam, the rebel poet. His songs and poems, sung and read aloud.',
  },
  {
    id: 'jamai-shashthi',
    name: 'Jamai Shashthi',
    bengaliName: 'জামাইষষ্ঠী',
    kind: 'puja',
    date: '2026-06-20',
    description: 'Mothers keep the Shashthi vrata for their children, and sons-in-law are welcomed home and fed far too well.',
    times: [
      { label: 'Shashthi tithi', from: '2026-06-19T16:59+05:30', to: '2026-06-20T15:46+05:30' },
    ],
    guptaPress: { date: '2026-06-20', times: [{ label: 'Shashthi tithi', from: '2026-06-19T22:16+05:30', to: '2026-06-20T20:57+05:30' }] },
  },
  {
    id: 'snan-yatra',
    name: 'Snan Yatra',
    bengaliName: 'স্নানযাত্রা',
    kind: 'festival',
    date: '2026-06-29',
    description: 'Jagannath’s bathing festival on the full moon of Joishtho, a fortnight before the chariots roll.',
    times: [
      { label: 'Purnima tithi', from: '2026-06-29T03:06+05:30', to: '2026-06-30T05:26+05:30' },
    ],
    guptaPress: { date: '2026-06-29', times: [{ label: 'Purnima tithi', from: '2026-06-29T02:46+05:30', to: '2026-06-30T04:46+05:30' }] },
  },
  {
    id: 'rath-yatra',
    name: 'Rath Yatra',
    bengaliName: 'রথযাত্রা',
    kind: 'festival',
    date: '2026-07-16',
    description: 'Jagannath, Balaram and Subhadra are pulled through the streets on their chariots. Fairs, papad and jilipi.',
    times: [
      { label: 'Dwitiya tithi', from: '2026-07-15T11:50+05:30', to: '2026-07-16T08:52+05:30' },
    ],
    guptaPress: { date: '2026-07-16' },
  },
  {
    id: 'ulto-rath',
    name: 'Ulto Rath',
    bengaliName: 'উল্টোরথ',
    kind: 'festival',
    date: '2026-07-24',
    description: 'The return journey: the chariots are pulled home again nine days after Rath.',
    times: [
      { label: 'Dashami tithi', from: '2026-07-23T07:03+05:30', to: '2026-07-24T09:12+05:30' },
    ],
  },
  {
    id: 'manasa-puja',
    name: 'Manasa Puja',
    bengaliName: 'মনসা পূজা',
    kind: 'puja',
    bengaliDate: { month: 3, day: 0 },
    date: '2026-08-17',
    description: 'On the last day of Shrabon, a puja to Manasa, goddess of snakes, kept above all in rural Bengal, where it is also Jhapan.',
    times: [
      { label: 'Simha sankranti', from: '2026-08-17T08:04+05:30' },
    ],
  },
  {
    id: 'jhulan',
    name: 'Jhulan Yatra',
    bengaliName: 'ঝুলন যাত্রা',
    kind: 'festival',
    date: '2026-08-23',
    until: '2026-08-28',
    days: [{ date: '2026-08-28', name: 'Jhulan Purnima and Rakhi', bengaliName: 'ঝুলন পূর্ণিমা' }],
    description: 'Radha and Krishna on a swing, and children building little scenes of clay figures around it. Rakhi is tied on the full moon.',
    times: [
      { label: 'Purnima tithi', from: '2026-08-27T09:08+05:30', to: '2026-08-28T09:48+05:30' },
      { label: 'Rakhi', from: '2026-08-28T05:18+05:30', to: '2026-08-28T09:48+05:30' },
    ],
  },
  {
    id: 'janmashtami',
    name: 'Janmashtami',
    bengaliName: 'জন্মাষ্টমী',
    kind: 'puja',
    date: '2026-09-04',
    description: 'Krishna’s birth, kept with a fast and a puja at midnight, and taler bora the next day.',
    times: [
      { label: 'Ashtami tithi', from: '2026-09-04T02:25+05:30', to: '2026-09-05T00:13+05:30' },
      { label: 'Nishita puja', from: '2026-09-04T23:13+05:30', to: '2026-09-04T23:59+05:30' },
    ],
    guptaPress: { date: '2026-09-04' },
  },
  {
    id: 'vishwakarma-puja',
    name: 'Vishwakarma Puja',
    bengaliName: 'বিশ্বকর্মা পূজা',
    kind: 'puja',
    bengaliDate: { month: 4, day: 0 },
    date: '2026-09-17',
    description: 'On the last day of Bhadro, a puja to the god of craftsmen for tools, machines and workshops. The sky fills with kites.',
    times: [
      { label: 'Kanya sankranti', from: '2026-09-17T07:58+05:30' },
    ],
  },
  {
    id: 'mahalaya',
    name: 'Mahalaya',
    bengaliName: 'মহালয়া',
    kind: 'festival',
    date: '2026-10-10',
    description: 'Before dawn, Mahishasuramardini on the radio and tarpan for the ancestors at the river. The Puja season begins.',
    times: [
      { label: 'Amavasya tithi', from: '2026-10-09T21:35+05:30', to: '2026-10-10T21:19+05:30' },
    ],
    guptaPress: { date: '2026-10-10', times: [{ label: 'Amavasya tithi', from: '2026-10-09T20:58+05:30', to: '2026-10-10T20:32+05:30' }] },
  },
  {
    id: 'durga-puja',
    name: 'Durga Puja',
    bengaliName: 'দুর্গাপূজা',
    kind: 'puja',
    date: '2026-10-17',
    until: '2026-10-21',
    days: [
      { date: '2026-10-17', name: 'Maha Shashthi', bengaliName: 'মহাষষ্ঠী' },
      { date: '2026-10-18', name: 'Maha Saptami', bengaliName: 'মহাসপ্তমী' },
      { date: '2026-10-19', name: 'Maha Ashtami', bengaliName: 'মহাষ্টমী' },
      { date: '2026-10-20', name: 'Maha Navami', bengaliName: 'মহানবমী' },
      { date: '2026-10-21', name: 'Bijoya Dashami', bengaliName: 'বিজয়া দশমী' },
    ],
    description: durgaPuja,
    times: [
      { label: 'Shashthi tithi', from: '2026-10-16T03:25+05:30', to: '2026-10-17T05:54+05:30' },
      { label: 'Saptami tithi', from: '2026-10-17T05:54+05:30', to: '2026-10-18T08:27+05:30' },
      { label: 'Ashtami tithi', from: '2026-10-18T08:27+05:30', to: '2026-10-19T10:51+05:30' },
      { label: 'Sandhi Puja', from: '2026-10-19T10:27+05:30', to: '2026-10-19T11:15+05:30' },
      { label: 'Navami tithi', from: '2026-10-19T10:51+05:30', to: '2026-10-20T12:50+05:30' },
      { label: 'Dashami tithi', from: '2026-10-20T12:50+05:30', to: '2026-10-21T14:11+05:30' },
      { label: 'Bijoya, aparahna', from: '2026-10-21T12:30+05:30', to: '2026-10-21T14:48+05:30' },
    ],
    guptaPress: {
      date: '2026-10-16',
      until: '2026-10-21',
      // Saptami holds at sunrise on the 18th too, by a few minutes; the almanac names no puja for it.
      days: [
        { date: '2026-10-16', name: 'Maha Shashthi', bengaliName: 'মহাষষ্ঠী' },
        { date: '2026-10-17', name: 'Maha Saptami', bengaliName: 'মহাসপ্তমী' },
        { date: '2026-10-19', name: 'Maha Ashtami', bengaliName: 'মহাষ্টমী' },
        { date: '2026-10-20', name: 'Maha Navami', bengaliName: 'মহানবমী' },
        { date: '2026-10-21', name: 'Bijoya Dashami', bengaliName: 'বিজয়া দশমী' },
      ],
      times: [
        { label: 'Saptami tithi', from: '2026-10-17T03:45+05:30', to: '2026-10-18T05:52+05:30' },
        { label: 'Ashtami tithi', from: '2026-10-18T05:52+05:30', to: '2026-10-19T07:49+05:30' },
        { label: 'Sandhi Puja', from: '2026-10-19T07:25+05:30', to: '2026-10-19T08:13+05:30' },
        { label: 'Navami tithi', from: '2026-10-19T07:49+05:30', to: '2026-10-20T09:29+05:30' },
        { label: 'Dashami tithi', from: '2026-10-20T09:29+05:30', to: '2026-10-21T10:46+05:30' },
      ],
    },
  },
  {
    id: 'lakshmi-puja',
    name: 'Kojagari Lakshmi Puja',
    bengaliName: 'কোজাগরী লক্ষ্মীপূজা',
    kind: 'puja',
    date: '2026-10-25',
    description: 'On the full moon after Durga Puja, Lakshmi is welcomed into every home: alpona on the floor, and the household awake into the night.',
    times: [
      { label: 'Purnima tithi', from: '2026-10-25T11:55+05:30', to: '2026-10-26T09:41+05:30' },
      { label: 'Nishita puja', from: '2026-10-25T22:56+05:30', to: '2026-10-25T23:46+05:30' },
    ],
    guptaPress: { date: '2026-10-25', times: [{ label: 'Purnima tithi', from: '2026-10-25T10:59+05:30', to: '2026-10-26T09:50+05:30' }] },
  },
  {
    id: 'kali-puja',
    name: 'Kali Puja',
    bengaliName: 'কালীপূজা',
    kind: 'puja',
    date: '2026-11-08',
    description: 'On the new moon of Dipanwita, a night puja to Kali, with lamps on every ledge and fireworks. Diwali to the rest of India.',
    times: [
      { label: 'Amavasya tithi', from: '2026-11-08T11:27+05:30', to: '2026-11-09T12:31+05:30' },
      { label: 'Nishita puja', from: '2026-11-08T22:55+05:30', to: '2026-11-08T23:46+05:30' },
    ],
    guptaPress: { date: '2026-11-08', times: [{ label: 'Amavasya tithi', from: '2026-11-08T10:48+05:30', to: '2026-11-09T11:27+05:30' }] },
  },
  {
    id: 'bhai-phonta',
    name: 'Bhai Phonta',
    bengaliName: 'ভাইফোঁটা',
    kind: 'festival',
    date: '2026-11-11',
    description: 'Sisters put a phonta of sandalwood on their brothers’ foreheads for a long life, and then everybody eats.',
    times: [
      { label: 'Dwitiya tithi', from: '2026-11-10T14:00+05:30', to: '2026-11-11T15:53+05:30' },
      { label: 'Phonta, aparahna', from: '2026-11-11T12:27+05:30', to: '2026-11-11T14:41+05:30' },
    ],
    guptaPress: { date: '2026-11-11', times: [{ label: 'Dwitiya tithi', from: '2026-11-10T12:37+05:30', to: '2026-11-11T14:11+05:30' }] },
  },
  {
    id: 'kartik-puja',
    name: 'Kartik Puja',
    bengaliName: 'কার্তিক পূজা',
    kind: 'puja',
    bengaliDate: { month: 6, day: 0 },
    date: '2026-11-16',
    description: 'On the last day of Kartik, a puja to Kartik, the gods’ handsome general, often left on the doorstep of newly married couples.',
    times: [
      { label: 'Vrishchika sankranti', from: '2026-11-16T19:48+05:30' },
    ],
  },
  {
    id: 'nabanna',
    name: 'Nabanna',
    bengaliName: 'নবান্ন',
    kind: 'festival',
    bengaliDate: { month: 7, day: 1 },
    date: '2026-11-17',
    description: 'The new rice of the harvest, cooked and offered first, at the start of Agrahayan. Each village keeps its own day; this is the first of the month.',
  },
  {
    id: 'jagaddhatri-puja',
    name: 'Jagaddhatri Puja',
    bengaliName: 'জগদ্ধাত্রী পূজা',
    kind: 'puja',
    date: '2026-11-19',
    description: 'Durga as the one who holds up the world, riding a lion. The great pujas are in Chandannagar and Krishnanagar.',
    times: [
      { label: 'Navami tithi', from: '2026-11-18T06:04+05:30', to: '2026-11-19T07:05+05:30' },
    ],
  },
  {
    id: 'rash-purnima',
    name: 'Rash Purnima',
    bengaliName: 'রাস পূর্ণিমা',
    kind: 'festival',
    date: '2026-11-24',
    description: 'The full moon of Krishna’s dance with the gopis, kept with fairs, above all in Nabadwip and Shantipur.',
    times: [
      { label: 'Purnima tithi', from: '2026-11-23T23:42+05:30', to: '2026-11-24T20:23+05:30' },
    ],
  },
  {
    id: 'poush-sankranti',
    name: 'Poush Sankranti',
    bengaliName: 'পৌষ সংক্রান্তি',
    kind: 'festival',
    bengaliDate: { month: 8, day: 0 },
    date: '2027-01-14',
    description: 'The last day of Poush, the winter harvest: pithe puli made from new rice and date-palm jaggery.',
    times: [
      { label: 'Makar sankranti', from: '2027-01-14T21:14+05:30' },
    ],
  },
  {
    id: 'saraswati-puja',
    name: 'Saraswati Puja',
    bengaliName: 'সরস্বতী পূজা',
    kind: 'puja',
    date: '2027-02-11',
    description: 'Basant Panchami. Books are laid at the goddess’s feet, the children write their first letters at hatekhori, and everybody wears yellow.',
    times: [
      { label: 'Panchami tithi', from: '2027-02-11T03:04+05:30', to: '2027-02-12T03:18+05:30' },
      { label: 'Puja muhurat', from: '2027-02-11T06:11+05:30', to: '2027-02-11T11:51+05:30' },
    ],
    guptaPress: { date: '2027-02-11', times: [{ label: 'Panchami tithi', from: '2027-02-11T00:44+05:30', to: '2027-02-12T00:24+05:30' }] },
  },
  {
    id: 'bhasha-dibas',
    name: 'Bhasha Dibas',
    bengaliName: 'ভাষা দিবস',
    kind: 'cultural',
    date: '2027-02-21',
    description: 'Ekushe February, International Mother Language Day, for those who died for the Bangla language in Dhaka in 1952.',
  },
  {
    id: 'shivratri',
    name: 'Shivratri',
    bengaliName: 'শিবরাত্রি',
    kind: 'puja',
    date: '2027-03-06',
    description: 'A night of fasting and four pujas to Shiva, with milk and bel leaves poured over the lingam.',
    times: [
      { label: 'Chaturdashi tithi', from: '2027-03-06T12:03+05:30', to: '2027-03-07T13:46+05:30' },
      { label: 'Nishita puja', from: '2027-03-06T23:23+05:30', to: '2027-03-07T00:12+05:30' },
    ],
  },
  {
    id: 'dol',
    name: 'Dol Jatra',
    bengaliName: 'দোলযাত্রা',
    kind: 'festival',
    date: '2027-03-22',
    description: 'Bengal’s Holi, on the full moon of Falgun: abir on the feet of elders and the faces of everybody else, and Basanta Utsav songs.',
    times: [
      { label: 'Purnima tithi', from: '2027-03-21T18:21+05:30', to: '2027-03-22T16:13+05:30' },
    ],
  },
  {
    id: 'basanti-puja',
    name: 'Basanti Puja',
    bengaliName: 'বাসন্তী পূজা',
    kind: 'puja',
    date: '2027-04-12',
    until: '2027-04-16',
    days: [
      { date: '2027-04-12', name: 'Shashthi', bengaliName: 'ষষ্ঠী' },
      { date: '2027-04-13', name: 'Saptami', bengaliName: 'সপ্তমী' },
      { date: '2027-04-14', name: 'Ashtami', bengaliName: 'অষ্টমী' },
      { date: '2027-04-15', name: 'Navami', bengaliName: 'নবমী' },
      { date: '2027-04-16', name: 'Dashami', bengaliName: 'দশমী' },
    ],
    description: 'Durga’s spring puja, the older of her two: kept in a few homes and temples rather than in pandals.',
    times: [
      { label: 'Shashthi tithi', from: '2027-04-11T21:39+05:30', to: '2027-04-12T19:34+05:30' },
      { label: 'Saptami tithi', from: '2027-04-12T19:34+05:30', to: '2027-04-13T17:28+05:30' },
      { label: 'Ashtami tithi', from: '2027-04-13T17:28+05:30', to: '2027-04-14T15:23+05:30' },
      { label: 'Navami tithi', from: '2027-04-14T15:23+05:30', to: '2027-04-15T13:20+05:30' },
      { label: 'Dashami tithi', from: '2027-04-15T13:20+05:30', to: '2027-04-16T11:21+05:30' },
    ],
  },
  {
    id: 'neel-puja',
    name: 'Neel Puja',
    bengaliName: 'নীল পূজা',
    kind: 'puja',
    bengaliDate: { month: 11, day: -1 },
    date: '2027-04-13',
    description: 'Mothers fast and pray to Shiva as Neelkantha for their children, on the day before Charak.',
  },
  {
    id: 'annapurna-puja',
    name: 'Annapurna Puja',
    bengaliName: 'অন্নপূর্ণা পূজা',
    kind: 'puja',
    date: '2027-04-14',
    description: 'A puja to Annapurna, who feeds the world, on the Ashtami of the spring Navaratri.',
    times: [
      { label: 'Ashtami tithi', from: '2027-04-13T17:28+05:30', to: '2027-04-14T15:23+05:30' },
    ],
  },
  {
    id: 'charak',
    name: 'Charak and Choitro Sankranti',
    bengaliName: 'চড়ক / চৈত্র সংক্রান্তি',
    kind: 'festival',
    bengaliDate: { month: 11, day: 0 },
    date: '2027-04-14',
    description: 'The last day of the Bengali year: the Charak fair and the gajan devotees of Shiva, and the Choitro sales before the new year.',
    times: [
      { label: 'Mesha sankranti', from: '2027-04-14T15:33+05:30' },
    ],
  },
  {
    id: 'ram-navami',
    name: 'Ram Navami',
    bengaliName: 'রামনবমী',
    kind: 'puja',
    date: '2027-04-15',
    description: 'Rama’s birthday, on the ninth day of the spring Navaratri.',
    times: [
      { label: 'Navami tithi', from: '2027-04-14T15:23+05:30', to: '2027-04-15T13:20+05:30' },
      { label: 'Madhyahna muhurat', from: '2027-04-15T10:21+05:30', to: '2027-04-15T12:53+05:30' },
    ],
  },
  {
    id: 'poila-boishakh',
    name: 'Poila Boishakh',
    bengaliName: 'পয়লা বৈশাখ',
    kind: 'festival',
    bengaliDate: { month: 0, day: 1 },
    date: '2027-04-15',
    description: 'The Bengali New Year, 1434. New clothes, a visit to the temple, sweets, and shopkeepers opening the year’s new account books.',
    times: [
      { label: 'Mesha sankranti, the day before', from: '2027-04-14T15:33+05:30' },
    ],
  },
]
