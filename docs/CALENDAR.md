# The Bengali calendar: which panjika, and why

West Bengal's Bengali calendar is printed in two panjikas, and they do not always agree on the
day. The calendar page shows both, with a switch between them. This note says what each is,
which the site starts on, and what moves when you switch.

---

## The two panjikas

Both count the year the same way. A month begins when the sun enters the next sign of the
sidereal zodiac (its *sankranti*), and a puja is kept by its *tithi*, the moon's twelve-degree
steps away from the sun. They disagree about **where the sun and moon are**.

### Bisuddha Siddhanta: the default

*Bisuddha* means "corrected". This panjika works from the sun and moon as they really are, using
modern astronomy. It is the one followed by drikpanchang, Belur Math and the West Bengal
government's holiday list, so the dates in the news and the state holidays are its dates.

It is the default because it is the one the site's puja dates and times were entered from. A
puja from one panjika shown next to Bengali dates from the other would be a day out somewhere.

The code is `sankrantiAt` in [src/domain/bengaliDate.ts](../src/domain/bengaliDate.ts). It is
tested against drikpanchang's month grids for 1431 to 1434.

### Surya Siddhanta: Gupta Press and Benimadhab Sil

This is the old Sanskrit astronomy, with mean motions counted from the creation and corrected
from a table of 24 sines. It is printed by the Gupta Press and Benimadhab Sil almanacs that hang
in many Bengali kitchens, and many family priests go by it. Its sun runs up to a day behind the
real one, so:

- **About a third of its months start a day later.** In 1433, six do: Shrabon, Bhadro, Ashwin,
  Kartik, Agrahayan and Magh.
- **Days kept on a sankranti are often a day later**: Manasa Puja, Vishwakarma Puja, Kartik
  Puja, Poush Sankranti, Charak.
- **Some pujas are a day either side**, wherever its moon puts a tithi on the other side of
  sunrise.

The code is [src/domain/suryaSiddhanta.ts](../src/domain/suryaSiddhanta.ts). It follows the
rules exactly as Reingold and Dershowitz set them out in *Calendrical Calculations*, chapter 20.

### How close the sums come to the print

They were checked against the 1433 almanac in October 2026.

- **Tithis:** every printed tithi time is 6 to 15 minutes after the sums (13 tithis checked).
  Nobody publishes why. It may be the meridian or a correction.
- **The sun:** Ambubachi, the sun entering Ardra, is printed 14 minutes after the sums.
- **Months:** 10 of the 12 months of 1433 start where the sums say. Bhadro and Ashwin do not: the
  sums put their sankrantis at 23:11 and 23:39, just before midnight, and the almanac starts both
  a day later. The sun's error is larger than the tithis' at that time of year.

So the page takes from the print whatever has been read, and uses the sums only where it has not:

- **Months:** a year read from the almanac is entered in `PRINTED_SURYA_MONTHS` in
  [src/domain/bengaliDate.ts](../src/domain/bengaliDate.ts) and used as printed. A year that has
  not been read is summed, and the page says under each month that it is *worked out, not yet
  checked*. Where a sankranti at either end falls within 90 minutes of midnight, it says the month
  may start or end a day either side. Today 1433 is printed, except where Choitro ends (1
  Boishakh 1434, which no source gave). 1434 and 1435 are summed.
- **Puja times:** only printed times are shown. Sankranti times are not shown in the Gupta Press
  view, because none has been found in print and the sums can be most of an hour out.

---

## What the switch changes

| | Bisuddha Siddhanta | Gupta Press |
|---|---|---|
| Bengali date on each day; where months start and end | from the real sun | from the Surya Siddhanta's sun, worked out |
| Days kept on a Bengali date: Poila Boishakh, Rabindra and Nazrul Jayanti, Nabanna | as entered | worked out from its months |
| Days kept on a sankranti: Manasa, Vishwakarma, Kartik Puja, Poush Sankranti, Neel, Charak | as entered, with drikpanchang's sankranti time | from its months, with no time |
| Pujas kept by tithi: Durga, Lakshmi, Kali, Saraswati and the rest | as entered, with drikpanchang's times | **as read in the almanac**, with its times, or left out until then |
| Bhasha Dibas (21 February) and our own evenings | unchanged | unchanged |

### Why tithi pujas are read, not worked out

The day a puja falls on depends on which tithi holds at sunrise, plus rules for each puja
(Sandhi Puja, the midnight puja of Kali, and so on). The Surya Siddhanta's moon can be a few
hours away from the real one, and a few hours is enough to cross sunrise. Working them out would
put some pujas on a day the almanac does not, and *a puja a day out is worse than no puja*.

So each puja carries a `guptaPress` date in the data (see `Ritual` in
[src/domain/ritual.ts](../src/domain/ritual.ts)) once someone has read it in the printed
almanac. Until then the Gupta Press view leaves the puja out and lists it under the month as
"not yet entered".

Days kept on a Bengali date or a sankranti have a `bengaliDate` field, and those are worked out.
Give a new ritual one of the two fields, whichever fits how it is kept.

### What has been read so far

**1433, read in October 2026.**

- **Source:** the Benimadhab Sil text transcribed at benimadhabsilpanjika.com, and the Gupta
  Press times quoted in Aaj Tak Bangla, TV9 Bangla, Sangbad Pratidin and Asianet Bangla. The two
  almanacs agree on every day, and on the times to within a minute or two.
- **Entered:** all twelve month starts, plus Jamai Shashthi, Snan Yatra, Rath Yatra, Janmashtami,
  Mahalaya, Durga Puja, Kojagari Lakshmi Puja, Kali Puja, Bhai Phonta and Saraswati Puja.
- **Two differences from Bisuddha:** Durga Puja starts a day earlier, with Shashthi on 16 Oct and
  Nabapatrika and Saptami on 17 Oct. Sandhi Puja is at 7:25 to 8:13 am in India, not 10:27 to
  11:15 am.
- **Dates only:** Rath Yatra and Janmashtami. The times quoted for them were 20 to 60 minutes
  away from every other printed time, so they were left out.
- **Not found in print yet:** Akshaya Tritiya, Ulto Rath, Jhulan, Jagaddhatri, Rash Purnima,
  Shivratri, Dol, Basanti and Annapurna Puja, and Ram Navami.

**1434: nothing yet.** Neither almanac was out in October 2026.

**Watch out when reading the almanac:** a time printed for the night ("রাত্রি ঘ ১২।৪৪" on 26
Magh) is after midnight, which is the next civil day. Several newspaper articles get this wrong
in their English dates.

---

## Not offered

- **Bangladesh's calendar.** This is the Bangla Academy's fixed calendar, where 1 Boishakh is
  always 14 April. It was built and taken out again at the owner's request: this is a West Bengal
  puja community's calendar.
- **Local panjikas** (Madanagupta, Nabin, and others) mostly follow one of these two.

## How the choice is kept

It is each visitor's own choice, kept in their browser (`calendar-panjika` in local storage).
Everyone starts on the Bisuddha Siddhanta. It is not a portal setting and it is not in the page
address, so a shared link opens on whichever panjika the person receiving it last chose.
