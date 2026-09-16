import { adults, children, type Household } from './household'

/**
 * The committee's working list, as a spreadsheet.
 *
 * The opposite job to the subject-access export, and so the opposite instinct. That one errs
 * towards completeness because it goes to the household it is about. This one gets emailed to a
 * caterer, printed for a door, and left in a downloads folder — so it carries the least that is
 * still useful: **no children's names, no notes, no sign-in addresses.**
 *
 * Adults and children are counted rather than listed, which is the number the caterer wanted in
 * the first place.
 */
export const COMMITTEE_COLUMNS = [
  'Household',
  'Main contact',
  'Email',
  'Phone',
  'Adults',
  'Children',
  'Membership',
  'Paid to',
  'Role',
] as const

/**
 * One field, quoted for CSV and made safe to open.
 *
 * Two separate problems. The first is ordinary escaping: a household called "Sen, Rina" would
 * otherwise become two columns.
 *
 * The second is that a spreadsheet treats a cell beginning `=`, `+`, `-` or `@` as a formula,
 * and this file is meant to be opened in one. A name typed into a form that begins with `=` then
 * runs as soon as somebody opens the list, which is a way of attacking the committee through
 * their own membership record. Prefixing an apostrophe makes it text again.
 */
function field(value: string | number | undefined): string {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

/** The whole list as CSV, ready to be saved. */
export function committeeCsv(households: Household[]): string {
  const rows = [...households]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((h) =>
      [
        h.name,
        h.contactName,
        h.email,
        h.phone ?? '',
        adults(h),
        children(h),
        h.membership.status === 'active' ? 'Active' : 'Lapsed',
        h.membership.paidTo || '',
        h.role === 'admin' ? 'Committee' : 'Member',
      ]
        .map(field)
        .join(','),
    )

  // A BOM, so Excel opens it as UTF-8 rather than mangling every Bengali name in the file.
  return `﻿${[COMMITTEE_COLUMNS.map(field).join(','), ...rows].join('\r\n')}\r\n`
}

export function committeeCsvFilename(today: string): string {
  return `13parbon-households-${today.slice(0, 10)}.csv`
}
