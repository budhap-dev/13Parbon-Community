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
    expect(screen.getByText(/1:30 pm to 5:30 pm/)).toBeInTheDocument()
    expect(screen.getByText('37 days to go')).toBeInTheDocument()
    // The registration form, opened away from the site.
    const register = screen.getByRole('link', { name: 'Register to come' })
    expect(register).toHaveAttribute('href', 'https://forms.example.org/attend')
    expect(register).toHaveAttribute('target', '_blank')
    expect(screen.queryByText(/There is nothing to book/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Facebook page' })).toHaveAttribute(
      'href',
      'https://www.facebook.com/groups/1337437436797813/',
    )
    // Coming and performing are two different things to put your name down for, on two forms.
    const stage = screen.getByRole('region', { name: 'Would you like to perform?' })
    expect(within(stage).getByText(/there is a place for you on the stage/)).toBeInTheDocument()
    expect(within(stage).getByRole('link', { name: 'Register to perform' })).toHaveAttribute(
      'href',
      'https://forms.example.org/perform',
    )
    const help = screen.getByRole('region', { name: 'A Festival is Best Shared' })
    expect(within(help).getByText(/We warmly welcome volunteers/)).toBeInTheDocument()
    expect(within(help).getByText(/please let us know/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Take a slot' })).not.toBeInTheDocument()
    // Passing the event on is how people are actually invited to it.
    expect(screen.getByRole('button', { name: /Share/ })).toBeInTheDocument()
    expect(document.title).toBe('Cultural programme · 13Parbon Community')
  })

  it('shows the venue on a map, and offers directions', async () => {
    renderEvent('mahalaya-cultural-programme-2026')
    const there = await screen.findByRole('region', { name: 'Getting there' })
    // The venue belongs to the event: we do not always meet in the same hall.
    const map = there.querySelector('iframe')
    expect(map).toHaveAttribute('title', 'Map showing The hall, Leeds, LS27 0JU')
    expect(map?.getAttribute('src')).toContain('openstreetmap.org')
    expect(map?.getAttribute('src')).toContain('marker=53.7397,-1.6156')
    const directions = within(there).getByRole('link', { name: /Get directions/ })
    expect(directions).toHaveAttribute('target', '_blank')
    expect(directions.getAttribute('href')).toContain('LS27%200JU')
  })

  it('hides registration and the countdown for past events', async () => {
    renderEvent('boishakhi-programme-2026')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Boishakhi programme')
    expect(screen.queryByText(/days to go/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'A Festival is Best Shared' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Would you like to perform?' })).not.toBeInTheDocument()
  })

  /*
   * The morning after. The evening is over but nobody has pressed Archive yet, which is the
   * ordinary state of a Sunday: the page used to answer "Now — happening now" to anybody who
   * opened it, for as long as it took somebody to file the evening.
   */
  it('says an evening has happened once its date has passed, archived or not', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/events/:slug" element={<EventPage />} />
      </Routes>,
      { route: '/events/mahalaya-cultural-programme-2026', now: new Date('2026-10-11T09:00:00') },
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Cultural programme' })).toBeInTheDocument()
    expect(screen.getByText('This evening has happened.')).toBeInTheDocument()
    expect(screen.queryByText(/days to go/)).not.toBeInTheDocument()
    expect(screen.queryByText('happening now')).not.toBeInTheDocument()
  })

  it('counts down on the day itself rather than calling it past', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/events/:slug" element={<EventPage />} />
      </Routes>,
      // Ten in the morning, four and a half hours before the doors. Still today all day, and
      // still today at eight in the evening once everybody has gone home.
      { route: '/events/mahalaya-cultural-programme-2026', now: new Date('2026-10-10T10:00:00') },
    )

    expect(await screen.findByText('Today')).toBeInTheDocument()
    expect(screen.queryByText('This evening has happened.')).not.toBeInTheDocument()
  })

  it('says there is nothing to book when the event has no form', async () => {
    renderEvent('saraswati-puja-2027')
    expect(await screen.findByRole('heading', { level: 1, name: 'Saraswati Puja' })).toBeInTheDocument()
    expect(screen.getByText(/There is nothing to book/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'tell the committee' })).toHaveAttribute('href', '/contact')
    expect(screen.queryByRole('link', { name: 'Register to come' })).not.toBeInTheDocument()
  })

  it('shows not found for an unknown or unlisted event', async () => {
    renderEvent('committee-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})
