import type { SignInAttempt } from '@/domain/document'
import type { EventAttendance } from '@/domain/attendance'
import type { Household } from '@/domain/household'
import type { ContactMessage } from '@/domain/contact'

/**
 * Sample households and registrations for the portal. Enough variety to show
 * every state the screens have to handle: an admin, a lapsed household, one that has
 * never signed in, and one whose membership has lapsed.
 */
export function buildPortalFixtures() {
  const households: Household[] = [
    {
      id: 'hh-sen',
      name: 'The Sens',
      contactName: 'Rina Sen',
      email: 'rina@example.com',
      phone: '[phone]',
      googleEmail: 'rina.sen@gmail.com',
      people: [
        { id: 'p-sen-1', name: 'Rina Sen', ageGroup: 'adult', note: 'Sings, happy to help on stage' },
        { id: 'p-sen-2', name: 'Arjun Sen', ageGroup: 'adult', note: 'Vegetarian' },
        { id: 'p-sen-3', name: 'Mira Sen', ageGroup: 'child', age: 7, note: 'Dance group' },
      ],
      interests: ['Cooking', 'Stage and sound'],
      memberSince: '2024-04-01',
      membership: { status: 'active', paidTo: '2027-03-31' },
      role: 'member',
    },
    {
      id: 'hh-chatterjee',
      name: 'The Chatterjees',
      contactName: 'Debashis Chatterjee',
      email: 'debashis@example.com',
      googleEmail: 'd.chatterjee@gmail.com',
      people: [{ id: 'p-cha-1', name: 'Debashis Chatterjee', ageGroup: 'adult' }],
      interests: ['Sound', 'Photos'],
      memberSince: '2021-01-10',
      membership: { status: 'active', paidTo: '2027-03-31' },
      role: 'admin',
    },
    {
      id: 'hh-banerjee',
      name: 'The Banerjees',
      contactName: 'Anita Banerjee',
      email: 'anita@example.com',
      googleEmail: 'anita.banerjee@gmail.com',
      people: [
        { id: 'p-ban-1', name: 'Anita Banerjee', ageGroup: 'adult' },
        { id: 'p-ban-2', name: 'Sujoy Banerjee', ageGroup: 'adult' },
        { id: 'p-ban-3', name: 'Ishan Banerjee', ageGroup: 'child', age: 11 },
        { id: 'p-ban-4', name: 'Tara Banerjee', ageGroup: 'child', age: 6 },
      ],
      interests: ['Cooking'],
      memberSince: '2022-03-14',
      membership: { status: 'active', paidTo: '2027-03-31' },
      role: 'admin',
    },
    {
      id: 'hh-ghosh',
      name: 'The Ghoshes',
      contactName: 'Meera Ghosh',
      email: 'meera@example.com',
      googleEmail: 'meera.ghosh@gmail.com',
      people: [
        { id: 'p-gho-1', name: 'Meera Ghosh', ageGroup: 'adult' },
        { id: 'p-gho-2', name: 'Ria Ghosh', ageGroup: 'child', age: 9 },
        { id: 'p-gho-3', name: 'Neel Ghosh', ageGroup: 'child', age: 4 },
      ],
      interests: ["Children's programme"],
      memberSince: '2026-09-01',
      membership: { status: 'active', paidTo: '2027-03-31' },
      role: 'member',
    },
    {
      id: 'hh-roy',
      name: 'The Roys',
      contactName: 'Kaushik Roy',
      email: 'kaushik@example.com',
      googleEmail: 'kaushik.roy@gmail.com',
      people: [
        { id: 'p-roy-1', name: 'Kaushik Roy', ageGroup: 'adult' },
        { id: 'p-roy-2', name: 'Sharmila Roy', ageGroup: 'adult' },
      ],
      interests: ['Treasury'],
      memberSince: '2023-11-02',
      membership: { status: 'active', paidTo: '2027-03-31' },
      role: 'member',
    },
    {
      id: 'hh-mitra',
      name: 'The Mitras',
      contactName: 'Sanjay Mitra',
      email: 'sanjay@example.com',
      googleEmail: 'sanjay.mitra@gmail.com',
      people: [
        { id: 'p-mit-1', name: 'Sanjay Mitra', ageGroup: 'adult' },
        { id: 'p-mit-2', name: 'Ruma Mitra', ageGroup: 'adult' },
        { id: 'p-mit-3', name: 'Ayan Mitra', ageGroup: 'child', age: 12 },
      ],
      interests: [],
      memberSince: '2025-02-20',
      membership: { status: 'active', paidTo: '2027-03-31' },
      role: 'member',
    },
    {
      id: 'hh-palit',
      name: 'The Palits',
      contactName: 'Joy Palit',
      email: 'joy@example.com',
      googleEmail: null,
      people: [
        { id: 'p-pal-1', name: 'Joy Palit', ageGroup: 'adult' },
        { id: 'p-pal-2', name: 'Sudipa Palit', ageGroup: 'adult' },
        { id: 'p-pal-3', name: 'Rohan Palit', ageGroup: 'child', age: 15 },
      ],
      interests: [],
      memberSince: '2020-02-11',
      membership: { status: 'lapsed', paidTo: '2026-03-31' },
      role: 'member',
    },
    {
      id: 'hh-das',
      name: 'The Dases',
      contactName: 'Ruma Das',
      email: 'ruma@example.com',
      googleEmail: null,
      people: [
        { id: 'p-das-1', name: 'Ruma Das', ageGroup: 'adult' },
        { id: 'p-das-2', name: 'Bikram Das', ageGroup: 'adult' },
      ],
      interests: ['Decorations'],
      memberSince: '2026-08-25',
      membership: { status: 'active', paidTo: '2027-03-31' },
      role: 'member',
    },
  ]


  const signInAttempts: SignInAttempt[] = [
    { id: 'sa-1', email: 'priya.dutta@gmail.com', name: 'Priya Dutta', lastTriedAt: '2026-09-03T16:12:00', attempts: 2, resolved: false },
    { id: 'sa-2', email: 'amit.bose@gmail.com', name: 'Amit Bose', lastTriedAt: '2026-09-02T10:30:00', attempts: 1, resolved: false },
  ]

  const messages: (ContactMessage & { handledBy?: string })[] = [
    {
      id: 'cm-1',
      name: 'Meera Ghosh',
      email: 'meera@example.com',
      subject: 'Parking on the night',
      message:
        'Is there parking at the venue, or should we look for something nearby? We are bringing my mother who cannot walk far, so it would help to know before the night.',
      createdAt: '2026-09-02T19:14:00',
    },
    {
      id: 'cm-2',
      name: 'Sanjay Mitra',
      email: 'sanjay@example.com',
      subject: 'Can my daughter sing at the programme?',
      message: 'She is nine and has been learning for three years. She would love a turn on the stage.',
      createdAt: '2026-09-01T08:40:00',
    },
    {
      id: 'cm-photo',
      name: 'Anjali Roy',
      email: 'anjali@example.com',
      subject: 'Please take down a photograph',
      kind: 'photo' as const,
      message:
        'There is a picture of my daughter in the Boishakhi album — she is in the yellow kurta near the front of the stage. She would rather it were not there. Thank you.',
      createdAt: '2026-09-02T21:40:00',
    },
    {
      id: 'cm-3',
      name: 'Ruma Das',
      email: 'ruma@example.com',
      subject: 'New to the area',
      message: 'We moved here in July and would love to come along to something.',
      createdAt: '2026-08-21T12:05:00',
      handledBy: 'Debashis Chatterjee',
    },
  ]

  /** A couple of years of numbers, which is what the history looks like once it has run a while. */
  const attendance: EventAttendance[] = [
    { eventId: 'ev-poila-2026', heldOn: '2026-04-18', households: 41, adults: 96, children: 34, recordedAt: '2026-04-20T10:00:00' },
    { eventId: 'ev-saraswati-2026', heldOn: '2026-02-01', households: 28, adults: 61, children: 40, recordedAt: '2026-02-03T10:00:00' },
  ]

  return { households, signInAttempts, messages, attendance }
}
