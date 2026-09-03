/**
 * The wording on the public site that the committee owns. Kept apart from the code so the
 * admin portal can edit it, and so there is one obvious place to look for anything still
 * written in brackets.
 */
export type SiteText = {
  bengaliTitleLead: string
  groupName: string
  tagline: string
  mission: string
  missionStatement: string
  joinTitle: string
  joinText: string
  town: string
  venue: string
  address: string
  email: string
  membershipFee: string
}

export type SiteTextField = keyof SiteText

/** Where each piece of wording shows up, in the order a visitor meets it. */
export const siteTextSections: { title: string; where: string; fields: SiteTextField[] }[] = [
  { title: 'The headline', where: 'Top of the home page', fields: ['bengaliTitleLead', 'groupName', 'tagline'] },
  { title: 'Who we are', where: 'Home page and About', fields: ['mission', 'missionStatement'] },
  { title: 'The join box', where: 'Foot of the home page', fields: ['joinTitle', 'joinText'] },
  { title: 'Community details', where: 'Header, footer and Contact', fields: ['town', 'venue', 'address', 'email', 'membershipFee'] },
]

export const siteTextLabels: Record<SiteTextField, string> = {
  bengaliTitleLead: 'First line, in Bengali',
  groupName: 'Second line, the name',
  tagline: 'The line underneath',
  mission: 'First paragraph',
  missionStatement: 'Second paragraph, mission and vision',
  joinTitle: 'Heading',
  joinText: 'Line underneath',
  town: 'Town',
  venue: 'Venue',
  address: 'Address',
  email: 'Email the committee reads',
  membershipFee: 'Membership fee',
}

/** Anything still in square brackets is visible to visitors exactly as written. */
export function isGap(value: string): boolean {
  return /\[[^\]]+\]/.test(value)
}

export function countGaps(text: SiteText): number {
  return Object.values(text).filter(isGap).length
}

export function gapFields(text: SiteText): SiteTextField[] {
  return (Object.keys(text) as SiteTextField[]).filter((field) => isGap(text[field]))
}
