import type { Household } from './household'

/**
 * Membership years, which run from 1 April to 31 March.
 *
 * A year is named by the April it starts in, so 2026 is 1 April 2026 to 31 March 2027 and reads
 * "2026–27". Read by the clock in the room: on 31 March somebody is still paying for the year
 * that is ending, and on 1 April for the one that has just begun.
 */
export function membershipYearOf(now: Date): number {
  // getMonth() counts from 0, so April is 3.
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

/** "2026–27". */
export function yearLabel(year: number): string {
  return `${year}–${String((year + 1) % 100).padStart(2, '0')}`
}

/** "April 2026 to March 2027", for the line under a year that needs saying in full once. */
export function yearSpan(year: number): string {
  return `April ${year} to March ${year + 1}`
}

export function hasPaid(household: Pick<Household, 'payments'>, year: number): boolean {
  return (household.payments ?? []).some((payment) => payment.year === year)
}

/** The ISO date a year's payment was ticked, or undefined where it has not been. */
export function paidOn(household: Pick<Household, 'payments'>, year: number): string | undefined {
  return household.payments?.find((payment) => payment.year === year)?.paidOn
}

/**
 * The households still to pay for a year, by name.
 *
 * Only those whose membership is active: a household marked lapsed has stopped, and listing them
 * every morning as owing money is a list nobody acts on.
 */
export function stillToPay<H extends Pick<Household, 'payments' | 'membership' | 'name'>>(households: H[], year: number): H[] {
  return households
    .filter((household) => household.membership.status === 'active' && !hasPaid(household, year))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** How many years back the household's own record goes on its card. */
const YEARS_SHOWN = 5

/**
 * The years to show on a household's record, newest first: this one and up to four before it,
 * none earlier than the year they joined. A year paid for further back stays listed too, so a
 * payment somebody recorded is never hidden by the window.
 */
export function yearsFor(household: Pick<Household, 'payments' | 'memberSince'>, year: number): number[] {
  const joined = membershipYearOf(new Date(`${household.memberSince}T12:00:00`))
  const first = Math.max(Number.isNaN(joined) ? year : joined, year - (YEARS_SHOWN - 1))
  const years = new Set<number>()
  for (let y = year; y >= Math.min(first, year); y--) years.add(y)
  for (const payment of household.payments ?? []) if (payment.year <= year) years.add(payment.year)
  return [...years].sort((a, b) => b - a)
}
