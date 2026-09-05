import { screen, within } from '@testing-library/react'
import { createMockApi } from '@/lib/api'
import { renderWithProviders, TEST_NOW } from '@/test/render'
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

  it('names the occasions still waiting for a date, and offers to tell you', async () => {
    // Only the Mahalaya programme is on the calendar in the app's own fixtures.
    renderWithProviders(<EventsPage />, { route: '/events', api: createMockApi({ now: () => TEST_NOW }) })
    const note = await screen.findByRole('complementary', { name: 'More of the year to come' })
    expect(note).toHaveTextContent('Boishakhi, Saraswati Puja and Holi are still being arranged')
    expect(within(note).getByRole('link', { name: 'Send the committee a message' })).toHaveAttribute(
      'href',
      '/contact',
    )
  })

  it('drops the note once every occasion has a date', async () => {
    renderWithProviders(<EventsPage />, { route: '/events' })
    await screen.findByRole('heading', { name: 'October 2026' })
    expect(screen.queryByRole('complementary', { name: 'More of the year to come' })).not.toBeInTheDocument()
  })

  it('leaves the note out while a filter is on', async () => {
    renderWithProviders(<EventsPage />, { route: '/events?festival=holi', api: createMockApi({ now: () => TEST_NOW }) })
    await screen.findByRole('link', { name: 'All' })
    expect(screen.queryByRole('complementary', { name: 'More of the year to come' })).not.toBeInTheDocument()
  })
})
