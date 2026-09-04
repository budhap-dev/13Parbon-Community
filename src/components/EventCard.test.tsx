import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { Event } from '@/domain/event'
import { EventCard } from './EventCard'

const base: Event = {
  id: 'e1',
  slug: 'holi-2027',
  title: 'Holi',
  summary: 'Colours and lunch.',
  startsAt: '2027-03-22T11:00:00',
  venue: 'The park',
  isPublic: true,
  registrationOpen: true,
  householdsRegistered: 0,
  status: 'published',
}

function renderCard(event: Event, level?: 2 | 3) {
  return render(
    <MemoryRouter>
      <EventCard event={event} headingLevel={level} />
    </MemoryRouter>,
  )
}

describe('EventCard', () => {
  it('shows the date stamp and links the title through to the event', () => {
    renderCard(base)
    expect(screen.getByText('22 MAR')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Holi' })).toHaveAttribute('href', '/events/holi-2027')
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    // Nothing to book, so a card leads to the event rather than promising a form.
    expect(screen.getByText('Details')).toBeInTheDocument()
  })

  it('honours the heading level, and says Look back for past events', () => {
    const { unmount } = renderCard({ ...base, registrationOpen: false }, 2)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    unmount()
    renderCard({ ...base, status: 'past' })
    expect(screen.getByText('Look back')).toBeInTheDocument()
  })
})
