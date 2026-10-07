import { screen, within } from '@testing-library/react'
import { createEmptyApi, createFailingApi, createTestApi, renderWithProviders } from '@/test/render'
import { NewsPage } from './NewsPage'

describe('NewsPage', () => {
  it('shows live announcements, pinned first, and the latest posts', async () => {
    renderWithProviders(<NewsPage />, { route: '/news' })
    const notices = await screen.findByRole('region', { name: 'Announcements' })
    const titles = within(notices)
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
    expect(titles).toEqual([
      'Registrations are open for the Mahalaya cultural programme',
      'A Festival is Best Shared',
    ])
    expect(within(notices).getByRole('link', { name: 'What is happening that day' })).toHaveAttribute(
      'href',
      '/events/mahalaya-cultural-programme-2026',
    )
    const posts = await screen.findAllByRole('heading', { level: 3 })
    expect(posts.map((h) => h.textContent)).toEqual([
      'Mahalaya programme: what to expect on the night',
      'We have a hall for the whole year',
      'Saraswati Puja 2026: thank you',
    ])
    expect(screen.getByRole('link', { name: '[Newsletter title], Autumn 2026' })).toBeInTheDocument()
    expect(document.title).toBe('News & announcements · 13Parbon Community')
  })

  it('filters posts by tag', async () => {
    renderWithProviders(<NewsPage />, { route: '/news?tag=Success%20stories' })
    expect(await screen.findByRole('link', { name: 'Success stories', current: true })).toBeInTheDocument()
    const posts = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(posts).toEqual(['We have a hall for the whole year', 'Saraswati Puja 2026: thank you'])
  })

  it('says the announcements and newsletters did not load, rather than leaving them out', async () => {
    const api = createTestApi()
    const failing = createFailingApi().news
    renderWithProviders(<NewsPage />, {
      route: '/news',
      api: { ...api, news: { ...api.news, listAnnouncements: failing.listAnnouncements, listNewsletters: failing.listNewsletters } },
    })
    const notices = await screen.findByRole('region', { name: 'Announcements' })
    expect(await within(notices).findByText(/could not load the announcements/)).toBeInTheDocument()
    const newsletters = screen.getByRole('region', { name: 'Newsletters' })
    expect(await within(newsletters).findByText(/could not load the newsletters/)).toBeInTheDocument()
  })

  it('still leaves them out when there are genuinely none', async () => {
    renderWithProviders(<NewsPage />, { route: '/news', api: createEmptyApi() })
    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Announcements' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Newsletters' })).not.toBeInTheDocument()
  })
})
