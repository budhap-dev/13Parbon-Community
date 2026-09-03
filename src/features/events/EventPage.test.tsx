import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '@/test/render'
import { EventPage } from './EventPage'

function renderEvent(slug: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/events/:slug" element={<EventPage />} />
    </Routes>,
    { route: `/events/${slug}` },
  )
}

describe('EventPage', () => {
  it('shows the event, its countdown, registration and volunteer roles', async () => {
    renderEvent('mahalaya-cultural-programme-2026')
    expect(await screen.findByRole('heading', { level: 1, name: 'Cultural programme' })).toBeInTheDocument()
    expect(screen.getByText(/Saturday 10 October, 5:00 pm to 9:30 pm/)).toBeInTheDocument()
    expect(screen.getByText('37 days to go')).toBeInTheDocument()
    // Registering happens on a form the committee runs; until its address is set, the page says so.
    expect(screen.queryByRole('link', { name: 'Register the family' })).not.toBeInTheDocument()
    expect(screen.getByText(/Registration opens shortly/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'tell the committee' })).toHaveAttribute('href', '/contact')
    const help = screen.getByRole('region', { name: 'A Festival is Best Shared' })
    expect(within(help).getByText(/We warmly welcome volunteers/)).toBeInTheDocument()
    expect(within(help).getByText(/please indicate this when registering/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Take a slot' })).not.toBeInTheDocument()
    expect(document.title).toBe('Cultural programme · 13Parbon Community')
  })

  it('hides registration and the countdown for past events', async () => {
    renderEvent('poila-boishakh-cultural-programme-2026')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Poila Boishakh cultural programme')
    expect(screen.queryByRole('link', { name: 'Register the family' })).not.toBeInTheDocument()
    expect(screen.queryByText(/days to go/)).not.toBeInTheDocument()
    expect(screen.getByText('40 households')).toBeInTheDocument()
    expect(screen.getByText('came')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'A Festival is Best Shared' })).not.toBeInTheDocument()
  })

  it('shows not found for an unknown or unlisted event', async () => {
    renderEvent('committee-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})
