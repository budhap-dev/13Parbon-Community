/**
 * The sun and moon by the Surya Siddhanta, the old astronomy the Gupta Press and Benimadhab Sil
 * panjikas still work from: mean motions counted from the creation, corrected by an epicycle read
 * off a table of 24 sines. Nothing here is the sky as it is; it is the sky as those almanacs say
 * it is, which can be hours away from it — and so a day away, now and then.
 *
 * The rules are as Reingold and Dershowitz set them down in Calendrical Calculations (the
 * "modern Hindu calendar", chapter 20), which follow the text. Time in them is counted in days
 * from midnight at Ujjain, on the old prime meridian; the functions here take and give ordinary
 * instants.
 */

/** The Surya Siddhanta's year and month, in days, exactly as it gives them. */
const SIDEREAL_YEAR = 365 + 279_457 / 1_080_000
const ANOMALISTIC_YEAR = 1_577_917_828_000 / (4_320_000_000 - 387)
const SIDEREAL_MONTH = 27 + 4_644_439 / 14_438_334
const ANOMALISTIC_MONTH = 1_577_917_828 / (57_753_336 - 488_199)

/** The start of the Kali Yuga, midnight at Ujjain on 18 February 3102 BC, as a day count (R.D.). */
const KALI_YUGA = -1_132_959
/** When the planets were all at the start of Aries, 1,955,880,000 years before the Kali Yuga. */
const CREATION = KALI_YUGA - 1_955_880_000 * SIDEREAL_YEAR

/** 1 January 1970 as a day count (R.D.). */
const UNIX_EPOCH_RD = 719_163
/** Ujjain's longitude east, in degrees: its midnight is this far ahead of Greenwich's. */
const UJJAIN = 75 + 46 / 60 + 6 / 3600
const DAY_MS = 86_400_000

const mod = (a: number, b: number) => ((a % b) + b) % b

/** Ujjain days from an instant, and back. */
const fromInstant = (at: Date) => at.getTime() / DAY_MS + UNIX_EPOCH_RD + UJJAIN / 360
const toInstant = (days: number) => new Date((days - UNIX_EPOCH_RD - UJJAIN / 360) * DAY_MS)

/** The table of sines, in steps of 3¾°, as the text rounds them: a radius of 3438 minutes. */
function sineTable(entry: number): number {
  const exact = 3438 * Math.sin((entry * 225 * Math.PI) / (60 * 180))
  const error = 0.215 * Math.sign(exact) * Math.sign(Math.abs(exact) - 1716)
  return Math.round(exact + error) / 3438
}

/** A sine read off the table, between its steps in a straight line. */
function sine(degrees: number): number {
  const entry = degrees / (225 / 60)
  const fraction = mod(entry, 1)
  return fraction * sineTable(Math.ceil(entry)) + (1 - fraction) * sineTable(Math.floor(entry))
}

function arcsine(amplitude: number): number {
  if (amplitude < 0) return -arcsine(-amplitude)
  let step = 0
  while (amplitude > sineTable(step)) step += 1
  const below = sineTable(step - 1)
  return (225 / 60) * (step - 1 + (amplitude - below) / (sineTable(step) - below))
}

const meanPosition = (days: number, period: number) => 360 * mod((days - CREATION) / period, 1)

/** A body's place, corrected by its epicycle, which shrinks a little as the anomaly grows. */
function truePosition(days: number, period: number, size: number, anomalistic: number, change: number): number {
  const offset = sine(meanPosition(days, anomalistic))
  const contraction = Math.abs(offset) * change * size
  return mod(meanPosition(days, period) - arcsine(offset * (size - contraction)), 360)
}

const sunAt = (days: number) => truePosition(days, SIDEREAL_YEAR, 14 / 360, ANOMALISTIC_YEAR, 1 / 42)
const moonAt = (days: number) => truePosition(days, SIDEREAL_MONTH, 32 / 360, ANOMALISTIC_MONTH, 1 / 96)

/** The sun's longitude from the start of Aries, in degrees. */
export const sunLongitude = (at: Date) => sunAt(fromInstant(at))

/** How far the moon is ahead of the sun, 0 to 360°: a tithi is each 12° of it. */
export const lunarPhase = (at: Date) => mod(moonAt(fromInstant(at)) - sunAt(fromInstant(at)), 360)

/** The first instant after `after` at which `angle` reaches `target`, for an angle that only grows. */
function whenReaches(angle: (days: number) => number, target: number, after: Date, step: number): Date {
  const behind = (days: number) => mod(angle(days) - target + 180, 360) - 180
  // From a step on, so a crossing at or just before `after` is not the one found.
  let hi = fromInstant(after) + step
  while (behind(hi) < 0 || behind(hi - step) >= 0) hi += step
  let lo = hi - step
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (behind(mid) < 0) lo = mid
    else hi = mid
  }
  return toInstant(hi)
}

/** When the sun next reaches a longitude after an instant: 66°40′, entering Ardra, is Ambubachi. */
export function sunReaches(longitude: number, after: Date): Date {
  return whenReaches(sunAt, longitude, after, 1)
}

/** When the sun enters a sign — 0 for Aries, Mesha — first after an instant: its sankranti. */
export const sankrantiAfter = (sign: number, after: Date) => sunReaches(sign * 30, after)

/**
 * When a tithi begins and ends, for the first time it begins after an instant. Tithi 1 is
 * Shukla Pratipad, 15 Purnima, 16 Krishna Pratipad and 30 Amavasya.
 */
export function tithiAfter(tithi: number, after: Date): { from: Date; to: Date } {
  const phase = (days: number) => mod(moonAt(days) - sunAt(days), 360)
  const from = whenReaches(phase, (tithi - 1) * 12, after, 1 / 24)
  return { from, to: whenReaches(phase, mod(tithi * 12, 360), from, 1 / 24) }
}

/** Which tithi it is at an instant, 1 to 30. */
export const tithiAt = (at: Date) => Math.floor(lunarPhase(at) / 12) + 1
