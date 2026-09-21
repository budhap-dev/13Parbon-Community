import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HouseholdExport } from '@/domain/subjectAccess'
import { DownloadExport } from './DownloadExport'

/**
 * What a household is handed when they ask what we hold about them.
 *
 * This is the screen behind a legal promise on the privacy page, and it had no test at all.
 * The two things that would matter if they broke are both easy to break silently: a field
 * that quietly stops being shown, so an export is incomplete without looking incomplete; and
 * an absent value rendering as blank, so "we hold no phone number for you" is indistinguishable
 * from "we forgot to print your phone number".
 */
const full: HouseholdExport = {
  takenAt: '2026-09-21T10:00:00.000Z',
  household: {
    id: 'hh-sen',
    name: 'The Sens',
    contactName: 'Rina Sen',
    email: 'rina@example.com',
    phone: '07700 900001',
    googleEmail: 'rina.sen@gmail.com',
    people: [
      { id: 'p1', name: 'Rina Sen', ageGroup: 'adult' },
      { id: 'p2', name: 'Ishan Sen', ageGroup: 'child', age: 9, note: 'No nuts' },
    ],
    interests: ['cooking'],
    memberSince: '2024-03-01',
    membership: { status: 'active', paidTo: '2027-03-01' },
    role: 'member',
  },
  messages: [
    {
      id: 'cm-1',
      name: 'Rina Sen',
      email: 'rina@example.com',
      subject: 'Parking on the night',
      message: 'Is there parking at the venue, or should we look for something nearby?',
      createdAt: '2026-09-02T19:14:00.000Z',
    },
  ],
  signInAttempts: [{ email: 'rina.sen@gmail.com', lastTriedAt: '2026-01-04T09:00:00.000Z', attempts: 2 }],
  changes: [{ action: 'household:edit', at: '2026-05-05T09:00:00.000Z', fields: ['phone', 'interests'] }],
  notes: ['Photographs are not listed here.'],
}

/** The same household with everything optional left out, which is a common real shape. */
const sparse: HouseholdExport = {
  ...full,
  household: {
    ...full.household,
    email: undefined,
    phone: undefined,
    googleEmail: null,
    people: [{ id: 'p1', name: 'Rina Sen', ageGroup: 'adult' }],
    membership: { status: 'lapsed', paidTo: null },
    role: 'admin',
  },
  messages: [],
  signInAttempts: [],
  changes: [],
  notes: [],
}

describe('before they have asked', () => {
  it('offers to gather it, and nothing else', () => {
    render(<DownloadExport onAsk={() => {}} />)
    expect(screen.getByRole('button', { name: 'Show me everything you hold' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Save it as a file' })).not.toBeInTheDocument()
  })

  it('says it is working, and will not be asked twice', async () => {
    const onAsk = vi.fn()
    render(<DownloadExport onAsk={onAsk} loading />)
    const button = screen.getByRole('button', { name: 'Gathering…' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onAsk).not.toHaveBeenCalled()
  })

  it('asks when pressed', async () => {
    const onAsk = vi.fn()
    render(<DownloadExport onAsk={onAsk} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show me everything you hold' }))
    expect(onAsk).toHaveBeenCalledOnce()
  })

  it('says so out loud when it could not be gathered', () => {
    render(<DownloadExport onAsk={() => {}} error="We could not reach the server." />)
    expect(screen.getByRole('alert')).toHaveTextContent('We could not reach the server.')
  })
})

describe('the report on screen', () => {
  /**
   * On screen as well as in the file, and this is the point of the component. Somebody
   * asking what we hold about them has been fobbed off, not answered, if the reply is a
   * file of JSON they have to open in something.
   */
  it('shows every field of the household', () => {
    render(<DownloadExport data={full} onAsk={() => {}} />)
    // 'Rina Sen' is deliberately not in this list: she is both the main contact and a person
    // in the household, so it appears twice and an exact match would be ambiguous.
    for (const value of [
      'The Sens',
      'rina@example.com',
      '07700 900001',
      'rina.sen@gmail.com',
      '2024-03-01',
      'Active, paid to 2027-03-01',
      'Member',
    ]) {
      expect(screen.getByText(value)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Rina Sen').length).toBeGreaterThanOrEqual(2)
  })

  it('names everybody in the household, with the children’s ages and notes', () => {
    render(<DownloadExport data={full} onAsk={() => {}} />)
    const people = screen.getByRole('heading', { name: 'People (2)' }).closest('section')!
    expect(within(people).getByText(/adult/)).toBeInTheDocument()
    expect(within(people).getByText(/child, age 9/)).toBeInTheDocument()
    expect(within(people).getByText(/No nuts/)).toBeInTheDocument()
  })

  it('lists the messages and the changes it found', () => {
    render(<DownloadExport data={full} onAsk={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Messages you sent us (1)' })).toBeInTheDocument()
    expect(screen.getByText('Parking on the night')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Changes recorded to your record (1)' })).toBeInTheDocument()
    expect(screen.getByText(/phone, interests/)).toBeInTheDocument()
  })

  it('says that a knock at the door was recorded, and how many times', () => {
    render(<DownloadExport data={full} onAsk={() => {}} />)
    expect(screen.getByText(/2 tries, last on 2026-01-04/)).toBeInTheDocument()
  })

  /**
   * The household is entitled to know its membership was marked lapsed. Which committee
   * member did it is a fact about that person, not about them — and the screen says so
   * rather than leaving the omission to be noticed.
   */
  it('explains what it deliberately does not say', () => {
    render(<DownloadExport data={full} onAsk={() => {}} />)
    expect(screen.getByText(/do not show which committee member made a change/i)).toBeInTheDocument()
    expect(screen.getByText('Photographs are not listed here.')).toBeInTheDocument()
  })

  /**
   * "None found" rather than an empty space. An export that silently omitted a section
   * would read as "there is nothing there", which is a different claim from "we looked and
   * found nothing" — and only one of them is true.
   */
  it('says plainly when a section is empty rather than leaving a gap', () => {
    render(<DownloadExport data={sparse} onAsk={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Messages you sent us (0)' })).toBeInTheDocument()
    expect(screen.getByText('None found.')).toBeInTheDocument()
    expect(screen.getByText('None recorded.')).toBeInTheDocument()
    // Nothing to say about sign-in attempts, so the section is not drawn at all.
    expect(screen.queryByRole('heading', { name: /tried to sign in/i })).not.toBeInTheDocument()
  })

  it('distinguishes what we do not hold from what it forgot to print', () => {
    render(<DownloadExport data={sparse} onAsk={() => {}} />)
    expect(screen.getByText('None recorded')).toBeInTheDocument()
    expect(screen.getByText('Not given')).toBeInTheDocument()
    expect(screen.getByText('No address recorded')).toBeInTheDocument()
    // Lapsed with no renewal date must not read as "Lapsed, paid to ".
    expect(screen.getByText('Lapsed')).toBeInTheDocument()
    expect(screen.getByText('Committee')).toBeInTheDocument()
  })
})

describe('saving it as a file', () => {
  const clicks: HTMLAnchorElement[] = []
  let created: string[] = []
  let revoked: string[] = []

  beforeEach(() => {
    clicks.length = 0
    created = []
    revoked = []
    // jsdom has neither, and a component that reaches for them has to be given them.
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:export-${created.length}`
      created.push(url)
      return url
    })
    URL.revokeObjectURL = vi.fn((url: string) => void revoked.push(url))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hands over a file named after the household and the day', async () => {
    render(<DownloadExport data={full} onAsk={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save it as a file' }))

    expect(clicks).toHaveLength(1)
    expect(clicks[0].download).toBe('13parbon-the-sens-2026-09-21.json')
    expect(clicks[0].href).toContain('blob:export-0')
    expect(screen.getByRole('status')).toHaveTextContent('Saved to your downloads.')
  })

  /**
   * Revoked on the next turn of the loop rather than straight away: the click has to have
   * been handled first, and revoking a URL the browser is still reading hands somebody an
   * empty file.
   */
  it('lets go of the blob once the browser has had it', async () => {
    render(<DownloadExport data={full} onAsk={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save it as a file' }))

    // Not asserted as "still held immediately afterwards": the timeout is zero, so whether it
    // has fired by the time this line runs is a race, and a test that depends on losing it
    // fails on a slow machine for no reason. What matters is that it is released at all —
    // a blob URL never revoked is a leak for as long as the tab is open.
    await waitFor(() => expect(revoked).toEqual(created))
  })
})
