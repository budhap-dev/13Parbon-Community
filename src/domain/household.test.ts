import { adults, children, describeSize, directoryEntry, type Household } from './household'

const base: Household = {
  id: 'h1',
  name: 'The Sens',
  contactName: 'Rina Sen',
  email: 'rina@example.com',
  phone: '07700 900001',
  googleEmail: 'rina.sen@gmail.com',
  people: [
    { id: 'p1', name: 'Rina Sen', ageGroup: 'adult' },
    { id: 'p2', name: 'Arjun Sen', ageGroup: 'adult' },
    { id: 'p3', name: 'Mira Sen', ageGroup: 'child', age: 7 },
  ],
  interests: ['Cooking'],
  memberSince: '2024-04-01',
  membership: { status: 'active', paidTo: '2027-03-31' },
  role: 'member',
  listedInDirectory: true,
  shareEmail: true,
  sharePhone: false,
}

describe('household', () => {
  it('counts adults and children separately', () => {
    expect(adults(base)).toBe(2)
    expect(children(base)).toBe(1)
    expect(describeSize(base)).toBe('2 adults, 1 child')
    expect(describeSize({ people: [base.people[0]] })).toBe('1 adult')
    expect(describeSize({ people: [...base.people, { id: 'p4', name: 'B', ageGroup: 'child' }] })).toBe('2 adults, 2 children')
  })

  it('honours each sharing choice in the directory entry', () => {
    const entry = directoryEntry(base)
    expect(entry).toMatchObject({ name: 'The Sens', size: '2 adults, 1 child', email: 'rina@example.com' })
    expect(entry?.phone).toBeUndefined()
    expect(directoryEntry({ ...base, shareEmail: false })?.email).toBeUndefined()
    expect(directoryEntry({ ...base, sharePhone: true })?.phone).toBe('07700 900001')
  })

  it('leaves a household out entirely when it has not opted in', () => {
    expect(directoryEntry({ ...base, listedInDirectory: false })).toBeNull()
  })

  it('never puts a person name in the directory entry', () => {
    expect(JSON.stringify(directoryEntry(base))).not.toContain('Mira')
  })
})
