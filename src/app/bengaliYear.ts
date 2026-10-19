import type { Ritual } from '@/domain/ritual'
import { year1433 } from './bengaliYear1433'
import { year1434 } from './bengaliYear1434'

/**
 * The pujas, festivals and cultural days of the Bengali year, as the calendar page shows them.
 *
 * By the Bisuddha Siddhanta panjika for Kolkata — the reckoning drikpanchang, Belur Math and the
 * West Bengal government's holiday list all use — because it is the one the Bengali dates on the
 * page are worked out by, and a puja on one panjika beside dates from another would be a day out
 * somewhere. The Gupta Press and Benimadhab Sil almanacs, on many kitchen walls, keep the older
 * Surya Siddhanta tables and put some of these a day either side: Durga Puja 2026 a day earlier,
 * and the sankranti days (Manasa, Kartik Puja, Poush Sankranti) often a day later.
 *
 * Where each year was taken from, and what in it is less sure, is at the top of its own file.
 *
 * The times are drikpanchang's for Kolkata, in Indian time, read off its festival and daily
 * panchang pages: the tithi each puja is kept in, the muhurat where the panjika gives one (Sandhi
 * Puja, the nishita puja at midnight), and the instant of each sankranti. A tithi often begins
 * the day before its puja — the puja is kept on the day the tithi holds at sunrise — so a tithi
 * that starts the evening before is not a mistake. Neel Puja has no tithi of its own, and the
 * cultural days are whole days, so they have no times.
 *
 * Add a year in a file of its own, as 1434 is, and its number to RITUAL_YEARS — the page says a
 * year without its number has not been entered, and draws only its days. An id is the same thing
 * from year to year, so keep it when the dates move. Each year ends with the next one's Poila
 * Boishakh, so the next file starts the day after.
 */
export const RITUAL_YEARS = [1433, 1434]

export const rituals: Ritual[] = [...year1433, ...year1434]
