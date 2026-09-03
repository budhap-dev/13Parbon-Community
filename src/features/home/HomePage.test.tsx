import { screen, within } from '@testing-library/react'
import type { ApiClient } from '@/lib/api'
import { renderWithProviders } from '@/test/render'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('opens with the Bengali headline and the two hero actions', () => {
    renderWithProviders(<HomePage />)
    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveTextContent('বারো মাসে 13 Parbon')
    expect(title.querySelector('[lang="bn"]')).toHaveTextContent('বারো মাসে')
    expect(screen.getByRole('link', { name: 'What’s on' })).toHaveAttribute('href', '/events')
    expect(screen.getByRole('link', { name: 'Our story' })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('img', { name: '13Parbon Community logo' })).toBeInTheDocument()
    expect(document.title).toBe('13Parbon Community')
  })

  it('features the next event with a countdown and registration', async () => {
    renderWithProviders(<HomePage />)
    const card = (await screen.findByRole('heading', { level: 2, name: 'Cultural programme' })).closest('section')!
    expect(within(card).getByText('Next event')).toBeInTheDocument()
    expect(within(card).getByText(/from Saturday 10 October/)).toBeInTheDocument()
    expect(within(card).getByText('31 households')).toBeInTheDocument()
    expect(within(card).getByLabelText('37 days to go')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Register the family' })).toHaveAttribute(
      'href',
      '/events/mahalaya-cultural-programme-2026',
    )
  })

  it('lists the three events after the featured one', async () => {
    renderWithProviders(<HomePage />)
    const section = (await screen.findByRole('heading', { name: 'Coming up' })).closest('section')!
    const titles = within(section)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual(['Saraswati Puja', 'Holi', 'Poila Boishakh cultural programme'])
    expect(within(section).getAllByRole('link', { name: 'RSVP for your family' })).toHaveLength(1)
    expect(within(section).getAllByRole('link', { name: 'Details' })[0]).toHaveAttribute('href', '/events/holi-2027')
  })

  it('highlights the next occasion in the year strip', async () => {
    renderWithProviders(<HomePage />)
    const chip = await screen.findByRole('link', { name: 'Mahalaya programme, next up' })
    expect(chip.className).toContain('chipActive')
    expect(screen.getByRole('link', { name: 'Poila Boishakh' }).className).not.toContain('chipActive')
  })

  it('shows the open volunteer role', async () => {
    renderWithProviders(<HomePage />)
    const strip = await screen.findByRole('complementary', { name: 'Volunteers needed' })
    expect(strip).toHaveTextContent('Stage and hall decorations, Saturday morning. 3 of 5 slots filled.')
    expect(within(strip).getByRole('link', { name: 'Take a slot' })).toHaveAttribute('href', '/login')
  })

  it('shows last year in a photo carousel', async () => {
    renderWithProviders(<HomePage />)
    const carousel = await screen.findByRole('region', { name: 'Photos from last year' })
    expect(within(carousel).getAllByRole('listitem', { hidden: true }).filter((li) => li.getAttribute('aria-roledescription') === 'slide')).toHaveLength(6)
    expect(within(carousel).getByRole('img', { name: 'Rabindrasangeet at the Poila Boishakh programme' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All albums' })).toHaveAttribute('href', '/gallery')
  })

  it('ends with the join call to action', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('link', { name: 'Become a member' })).toHaveAttribute('href', '/join')
    expect(screen.getByText(/Membership is \[fee\] a year per household/)).toBeInTheDocument()
  })

  it('hides data-driven sections when there is nothing to show', async () => {
    const empty: ApiClient = {
      events: { listUpcoming: async () => [], getNext: async () => null },
      festivals: { list: async () => [] },
      gallery: { listRecentMedia: async () => [] },
      volunteering: { listOpenRoles: async () => [] },
    }
    renderWithProviders(<HomePage />, { api: empty })
    await screen.findByRole('heading', { name: 'Who we are' })
    expect(screen.queryByText('Next event')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Coming up' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Our year' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Photos from last year' })).not.toBeInTheDocument()
  })
})
