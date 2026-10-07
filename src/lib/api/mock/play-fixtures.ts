import type { Poll } from '@/domain/polls'
import type { BankQuestion, Quiz } from '@/domain/quizzes'
import type { Suggestion } from '@/domain/suggestions'

/**
 * Sample polls, quizzes and suggestions, so the screens have something to show without a
 * database. Dated around the test clock (3 September 2026) and left open-ended where they
 * should still be open on a laptop months later.
 */
export function buildPlayFixtures() {
  const polls: Poll[] = [
    {
      id: 'poll-picnic',
      title: 'Which Sunday suits your household for the autumn picnic?',
      detail: 'Riverside Park, from noon. We will book the shelter for whichever date most households choose.',
      options: ['Sunday 18 October', 'Sunday 25 October', 'Sunday 1 November'],
      named: false,
      results: 'after_vote',
      opensAt: '2026-08-28T09:00:00.000Z',
      createdAt: '2026-08-27T18:00:00.000Z',
    },
    {
      id: 'poll-setup',
      title: 'Can somebody from your household help set up the hall for Durga Puja?',
      detail: 'Friday evening from 6pm. Named, so we know who to expect.',
      options: ['Yes, count us in', 'Maybe — ask us nearer the time', 'Not this year'],
      named: true,
      results: 'committee',
      opensAt: '2026-08-30T09:00:00.000Z',
      closesAt: '2026-12-31T23:00:00.000Z',
      createdAt: '2026-08-29T18:00:00.000Z',
    },
    {
      id: 'poll-bhog',
      title: 'Saraswati Puja lunch: what should the committee order?',
      detail: '',
      options: ['Khichuri and labra', 'Pulao and alur dom', 'Both, smaller portions'],
      named: false,
      results: 'after_close',
      opensAt: '2026-08-20T09:00:00.000Z',
      closesAt: '2026-12-31T23:00:00.000Z',
      createdAt: '2026-08-19T18:00:00.000Z',
    },
    {
      id: 'poll-time',
      title: 'Was 4pm a good start time for Poila Boishakh?',
      detail: '',
      options: ['Yes', 'Earlier would be better', 'Later would be better'],
      named: false,
      results: 'after_vote',
      opensAt: '2026-04-20T09:00:00.000Z',
      closesAt: '2026-05-04T09:00:00.000Z',
      createdAt: '2026-04-19T18:00:00.000Z',
    },
    {
      id: 'poll-draft',
      title: 'Should we run a Bengali class for children on Saturday mornings?',
      detail: 'Still being worded.',
      options: ['Yes', 'No', 'Only in term time'],
      named: false,
      results: 'after_vote',
      createdAt: '2026-09-01T18:00:00.000Z',
    },
  ]

  /** Who voted which way, per poll — the mock's poll_votes. */
  const votes: Record<string, Record<string, number>> = {
    'poll-picnic': { 'hh-ghosh': 1, 'hh-roy': 1, 'hh-mitra': 0, 'hh-das': 2 },
    'poll-setup': { 'hh-ghosh': 0, 'hh-banerjee': 0, 'hh-palit': 1 },
    'poll-bhog': { 'hh-roy': 0, 'hh-mitra': 0, 'hh-palit': 2 },
    'poll-time': { 'hh-sen': 0, 'hh-ghosh': 0, 'hh-roy': 1, 'hh-das': 0 },
  }

  const questions: BankQuestion[] = [
    {
      id: 'q-swan',
      prompt: 'Which goddess rides a swan?',
      options: ['Lakshmi', 'Saraswati', 'Durga', 'Kali'],
      correct: 1,
      explanation: 'Saraswati’s vahana is the hamsa, the swan — said to separate milk from water, as wisdom separates truth from falsehood.',
      tags: ['saraswati-puja'],
      locked: false,
    },
    {
      id: 'q-days',
      prompt: 'On which day of Durga Puja is Sindoor Khela played?',
      options: ['Saptami', 'Ashtami', 'Navami', 'Dashami'],
      correct: 3,
      explanation: 'On Bijoya Dashami, before the goddess is taken for immersion.',
      tags: ['durga-puja'],
      locked: false,
    },
    {
      id: 'q-mahalaya',
      prompt: 'Mahalaya marks the start of which fortnight?',
      options: ['Pitri Paksha ending, Devi Paksha beginning', 'The harvest', 'The monsoon'],
      correct: 0,
      explanation: 'Mahalaya ends the fortnight of the ancestors and begins Devi Paksha, the goddess’s fortnight.',
      tags: ['durga-puja', 'mahalaya'],
      locked: false,
    },
    {
      id: 'q-dhak',
      prompt: 'What is the large drum played at Durga Puja called?',
      options: ['Tabla', 'Dhak', 'Khol', 'Mridangam'],
      correct: 1,
      explanation: '',
      tags: ['durga-puja', 'music'],
      locked: false,
    },
    {
      id: 'q-boishakh',
      prompt: 'Poila Boishakh is the first day of which month?',
      options: ['Boishakh', 'Ashwin', 'Magh'],
      correct: 0,
      explanation: 'The Bengali New Year falls on the first of Boishakh, in mid-April.',
      tags: ['poila-boishakh'],
      locked: false,
    },
    {
      id: 'q-mishti',
      prompt: '“Mishti” means…',
      options: ['Sweet', 'Salty', 'Spicy', 'Sour'],
      correct: 0,
      explanation: '',
      tags: ['words', 'food'],
      locked: false,
    },
    {
      id: 'q-bari',
      prompt: '“Bari” means…',
      options: ['Market', 'Home', 'School'],
      correct: 1,
      explanation: '',
      tags: ['words'],
      locked: false,
    },
    {
      id: 'q-jol',
      prompt: '“Jol” means…',
      options: ['Fire', 'Water', 'Air'],
      correct: 1,
      explanation: '',
      tags: ['words'],
      locked: false,
    },
    {
      id: 'q-kojagori',
      prompt: 'Kojagori Lakshmi Puja falls on which night?',
      options: ['The full moon after Durga Puja', 'The new moon of Kartik', 'The first night of Navaratri'],
      correct: 0,
      explanation: '',
      tags: ['lakshmi-puja'],
      creditedTo: 'The Ghoshes',
      locked: false,
    },
  ]

  const quizzes: Quiz[] = [
    {
      id: 'quiz-pujo',
      title: 'Durga Puja: how well do you know it?',
      intro: 'Four questions for the season. Anybody can play — no sign-in needed.',
      audience: 'public',
      opensAt: '2026-08-25T09:00:00.000Z',
      createdAt: '2026-08-24T18:00:00.000Z',
      questionIds: ['q-days', 'q-mahalaya', 'q-dhak', 'q-swan'],
    },
    {
      id: 'quiz-words',
      title: 'Bengali words for children',
      intro: 'Three everyday words. Play together as a family — one go per household.',
      audience: 'members',
      opensAt: '2026-08-25T09:00:00.000Z',
      createdAt: '2026-08-24T18:00:00.000Z',
      questionIds: ['q-mishti', 'q-bari', 'q-jol'],
    },
    {
      id: 'quiz-draft',
      title: 'Lakshmi Puja quiz',
      intro: '',
      audience: 'members',
      createdAt: '2026-09-01T18:00:00.000Z',
      questionIds: ['q-kojagori'],
    },
  ]

  /** The mock's quiz_attempts, keyed by quiz then household. */
  const attempts: Record<string, Record<string, { score: number; total: number; answers: number[]; showName: boolean; playedAt: string }>> = {
    'quiz-words': {
      'hh-ghosh': { score: 3, total: 3, answers: [0, 1, 1], showName: true, playedAt: '2026-08-26T19:00:00.000Z' },
      'hh-roy': { score: 2, total: 3, answers: [0, 1, 0], showName: false, playedAt: '2026-08-27T19:00:00.000Z' },
      'hh-mitra': { score: 2, total: 3, answers: [0, 0, 1], showName: true, playedAt: '2026-08-28T19:00:00.000Z' },
    },
  }

  /** Visitors who played, as a number. */
  const publicPlays: Record<string, number> = { 'quiz-pujo': 14 }

  const suggestions: Suggestion[] = [
    {
      id: 'sg-1',
      kind: 'question',
      prompt: 'Which river runs past Kumartuli, where the idols are made?',
      options: ['Hooghly', 'Damodar', 'Padma'],
      answer: 0,
      note: 'For the Durga Puja quiz next year?',
      credit: true,
      householdId: 'hh-ghosh',
      status: 'pending',
      createdAt: '2026-08-31T20:00:00.000Z',
    },
    {
      id: 'sg-2',
      kind: 'poll',
      prompt: 'Would you come to a monthly adda on a Friday evening?',
      options: ['Yes', 'Sometimes', 'No'],
      note: '',
      credit: false,
      householdId: 'hh-das',
      status: 'pending',
      createdAt: '2026-09-01T20:00:00.000Z',
    },
    {
      id: 'sg-3',
      kind: 'question',
      prompt: 'Kojagori Lakshmi Puja falls on which night?',
      options: ['The full moon after Durga Puja', 'The new moon of Kartik', 'The first night of Navaratri'],
      answer: 0,
      note: '',
      credit: true,
      householdId: 'hh-ghosh',
      status: 'approved',
      reviewedBy: 'The Chatterjees',
      reviewedAt: '2026-09-01T09:00:00.000Z',
      createdAt: '2026-08-20T20:00:00.000Z',
    },
  ]

  return { polls, votes, questions, quizzes, attempts, publicPlays, suggestions }
}
