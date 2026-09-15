import { describe, expect, it } from 'vitest'
import { committeeCsv, committeeCsvFilename, COMMITTEE_COLUMNS } from './committeeExport'
import type { Household } from './household'

const base: Household = {
  id: 'hh-sen',
  name: 'The Sens',
  contactName: 'Rina Sen',
  email: 'rina@example.com',
  phone: '07700 900001',
  googleEmail: 'rina.sen@gmail.com',
  people: [
    { id: 'p1', name: 'Rina Sen', ageGroup: 'adult', note: 'Sings' },
    { id: 'p2', name: 'Arjun Sen', ageGroup: 'adult' },
    { id: 'p3', name: 'Mira Sen', ageGroup: 'child', age: 7, note: 'Dance group' },
  ],
  interests: ['Cooking'],
  memberSince: '2024-04-01',
  membership: { status: 'active', paidTo: '2027-03-31' },
  role: 'member',
  listedInDirectory: true,
  shareEmail: true,
  sharePhone: false,
}

describe('the committee list', () => {
  it('counts the household rather than naming everybody in it', () => {
    const csv = committeeCsv([base])
    expect(csv).toContain('"2","1"')
    expect(csv).not.toMatch(/Mira Sen/)
    expect(csv).not.toMatch(/Arjun Sen/)
  })

  it('leaves out the notes, which are about people and not about the household', () => {
    const csv = committeeCsv([base])
    expect(csv).not.toMatch(/Dance group/)
    expect(csv).not.toMatch(/Sings/)
  })

  it('leaves out the sign-in address, because this file gets emailed about', () => {
    expect(committeeCsv([base])).not.toMatch(/rina\.sen@gmail\.com/)
  })

  it('carries the columns the caterer and the treasurer actually want', () => {
    const [header] = committeeCsv([base]).split('\r\n')
    for (const column of COMMITTEE_COLUMNS) expect(header).toContain(column)
  })

  it('sorts by household name', () => {
    const rows = committeeCsv([base, { ...base, id: 'hh-a', name: 'The Ahmeds' }]).split('\r\n')
    expect(rows[1]).toContain('The Ahmeds')
    expect(rows[2]).toContain('The Sens')
  })
})

describe('making it safe to open', () => {
  it('quotes a comma instead of letting it become a second column', () => {
    const csv = committeeCsv([{ ...base, name: 'Sen, Rina and family' }])
    expect(csv).toContain('"Sen, Rina and family"')
    expect(csv.split('\r\n')[1].split('","')).toHaveLength(COMMITTEE_COLUMNS.length)
  })

  it('doubles a quotation mark inside a name', () => {
    expect(committeeCsv([{ ...base, name: 'The "Sen" family' }])).toContain('"The ""Sen"" family"')
  })

  it('will not let a name become a formula when the file is opened', () => {
    // A spreadsheet runs a cell starting with = or +. A name typed into the form is a way in.
    const csv = committeeCsv([{ ...base, contactName: '=HYPERLINK("http://evil","click")' }])
    expect(csv).toContain(`"'=HYPERLINK`)
  })

  it('opens as UTF-8, so a Bengali name survives the trip through Excel', () => {
    expect(committeeCsv([{ ...base, name: 'সেন পরিবার' }]).startsWith('﻿')).toBe(true)
  })
})

describe('the filename', () => {
  it('carries the date it was taken', () => {
    expect(committeeCsvFilename('2026-09-15T10:00:00')).toBe('13parbon-households-2026-09-15.csv')
  })
})
