import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { EventsPage } from './EventsPage'

describe('EventsPage', () => {
  it('groups upcoming events by month and lists earlier ones', async () => {
    renderWithProviders(<EventsPage />, { route: '/events' })
    expect(screen.getByRole('heading', { level: 1, name: 'What’s on' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    const months = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
    expect(months).toEqual(['October 2026', 'February 2027', 'March 2027', 'April 2027', 'Earlier this year'])
    const past = screen.getByRole('region', { name: 'Earlier this year' })
    expect(within(past).getByText('Look back')).toBeInTheDocument()
    expect(document.title).toBe('Events · 13Parbon Community')
  })

  it('filters by occasion from the query string', async () => {
    renderWithProviders(<EventsPage />, { route: '/events?festival=holi' })
    expect(await screen.findByRole('heading', { name: 'March 2027' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'October 2026' })).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Holi', current: true })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByRole('heading', { name: 'Earlier this year' })).not.toBeInTheDocument()
  })

  it('explains when a filter has nothing scheduled', async () => {
    renderWithProviders(<EventsPage />, { route: '/events?festival=rath-yatra' })
    await screen.findByRole('link', { name: 'All' })
    expect(await screen.findByText(/Nothing scheduled yet/)).toBeInTheDocument()
  })
})
