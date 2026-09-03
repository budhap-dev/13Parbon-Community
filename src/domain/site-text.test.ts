import { countGaps, gapFields, isGap, siteTextLabels, siteTextSections, type SiteText } from './site-text'

const text: SiteText = {
  bengaliTitleLead: 'বারো মাসে',
  groupName: '13 Parbon',
  tagline: 'Twelve months, thirteen festivals.',
  mission: 'A Bengali cultural association in [Town].',
  missionStatement: '[Mission and vision statement.]',
  joinTitle: 'Come for one evening.',
  joinText: 'Everyone is welcome.',
  town: '[Town]',
  venue: '[Venue]',
  address: '[Street, Town, Postcode]',
  email: '[hello@example.org]',
  membershipFee: '[fee]',
}

describe('site text', () => {
  it('spots wording still in brackets', () => {
    expect(isGap('A Bengali cultural association in [Town].')).toBe(true)
    expect(isGap('Twelve months, thirteen festivals.')).toBe(false)
    expect(isGap('')).toBe(false)
  })

  it('counts and names every gap', () => {
    expect(countGaps(text)).toBe(7)
    expect(gapFields(text)).toEqual(['mission', 'missionStatement', 'town', 'venue', 'address', 'email', 'membershipFee'])
    expect(countGaps({ ...text, town: 'Reading', venue: 'The Town Hall' })).toBe(5)
  })

  it('covers every field in a section, and labels all of them', () => {
    const inSections = siteTextSections.flatMap((s) => s.fields)
    expect([...inSections].sort()).toEqual((Object.keys(text) as (keyof SiteText)[]).sort())
    for (const field of inSections) expect(siteTextLabels[field]).toBeTruthy()
  })
})
