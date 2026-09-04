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
  it('shows the event, its countdown and where the details appear', async () => {
    renderEvent('mahalaya-cultural-programme-2026')
    expect(await screen.findByRole('heading', { level: 1, name: 'Cultural programme' })).toBeInTheDocument()
    const theme = screen.getByRole('region', { name: 'This year’s theme' })
    expect(within(theme).getByText('দুর্গাপূজার সেকাল ও একাল')).toHaveAttribute('lang', 'bn')
    expect(within(theme).getByText('ঐতিহ্যের সাথে আধুনিকতা')).toBeInTheDocument()
    // In English too, since nobody has to be Bengali to come.
    expect(within(theme).getByText('Durga Puja: Then and Now — Tradition Meets Modernity')).toBeInTheDocument()
    expect(screen.getByText('Saturday 10 October')).toBeInTheDocument()
    expect(screen.getByText(/1:30 pm to 9:30 pm/)).toBeInTheDocument()
    expect(screen.getByText('37 days to go')).toBeInTheDocument()
    // Nothing to book: the details go out on the channels the community already uses.
    expect(screen.getByText(/There is nothing to book/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Facebook page' })).toHaveAttribute(
      'href',
      'https://www.facebook.com/groups/1337437436797813/',
    )
    expect(screen.getByRole('link', { name: 'tell the committee' })).toHaveAttribute('href', '/contact')
    const help = screen.getByRole('region', { name: 'A Festival is Best Shared' })
    expect(within(help).getByText(/We warmly welcome volunteers/)).toBeInTheDocument()
    expect(within(help).getByText(/please let us know/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Take a slot' })).not.toBeInTheDocument()
    expect(document.title).toBe('Cultural programme · 13Parbon Community')
  })

  it('hides registration and the countdown for past events', async () => {
    renderEvent('poila-boishakh-cultural-programme-2026')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Poila Boishakh cultural programme')
    expect(screen.queryByText(/days to go/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'A Festival is Best Shared' })).not.toBeInTheDocument()
  })

  it('shows not found for an unknown or unlisted event', async () => {
    renderEvent('committee-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})
