import { screen, within } from '@testing-library/react'
import { createEmptyApi, renderWithProviders } from '@/test/render'
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

  it('shows the public MVP: next event and photos, but no calendar for visitors', async () => {
    renderWithProviders(<HomePage />)
    const mosaic = await screen.findByRole('region', { name: 'Moments from our year' })
    expect(mosaic.querySelectorAll('img')).toHaveLength(5)
    expect(within(mosaic).getByText('Holi colours')).toBeInTheDocument()
    await screen.findByRole('region', { name: 'Photos from last year' })
    expect(await screen.findByText('Next event')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Coming up' })).not.toBeInTheDocument()
  })

  it('features the next event with a countdown and registration', async () => {
    renderWithProviders(<HomePage />)
    const card = (await screen.findByRole('heading', { level: 2, name: 'Cultural programme' })).closest('section')!
    expect(within(card).getByText('Next event')).toBeInTheDocument()
    expect(within(card).getByText(/from Saturday 10 October/)).toBeInTheDocument()
    expect(within(card).getByText('31 households')).toBeInTheDocument()
    expect(within(card).getByText('37 days to go')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Register the family' })).toHaveAttribute(
      'href',
      '/events/mahalaya-cultural-programme-2026',
    )
  })

  it('lists the three events after the featured one for members', async () => {
    renderWithProviders(<HomePage />, { session: { role: 'member', householdId: 'hh-sen', householdName: 'The Sens', name: 'Rina Sen', email: 'rina.sen@gmail.com' } })
    const section = (await screen.findByRole('heading', { name: 'Coming up' })).closest('section')!
    const titles = within(section)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual(['Saraswati Puja', 'Holi', 'Poila Boishakh cultural programme'])
    expect(within(section).getAllByText('RSVP for your family')).toHaveLength(1)
    expect(within(section).getByRole('link', { name: 'Holi' })).toHaveAttribute('href', '/events/holi-2027')
  })

  it('highlights the next occasion in the year strip', async () => {
    renderWithProviders(<HomePage />)
    const chip = await screen.findByRole('link', { name: 'Mahalaya programme, next up' })
    expect(chip.className).toContain('chipActive')
    expect(screen.getByRole('link', { name: 'Poila Boishakh' }).className).not.toContain('chipActive')
  })

  it('announces that volunteers are welcome at the next event, for everyone', async () => {
    renderWithProviders(<HomePage />)
    const strip = await screen.findByRole('complementary', { name: 'A Festival is Best Shared' })
    expect(strip).toHaveTextContent('We warmly welcome volunteers for our Cultural Programme on Saturday, 10 October.')
    expect(strip).toHaveTextContent('please indicate this when registering')
    expect(within(strip).getByRole('link', { name: 'Register and say so' })).toHaveAttribute(
      'href',
      '/events/mahalaya-cultural-programme-2026',
    )
  })

  it('shows last year in a photo carousel', async () => {
    renderWithProviders(<HomePage />)
    const carousel = await screen.findByRole('region', { name: 'Photos from last year' })
    expect(within(carousel).getAllByRole('listitem', { hidden: true }).filter((li) => li.getAttribute('aria-roledescription') === 'slide')).toHaveLength(6)
    expect(within(carousel).getByText('Rabindrasangeet at the Poila Boishakh programme')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'All albums' })[1]).toHaveAttribute('href', '/gallery')
  })

  it('ends by inviting people to an event rather than to a sign-up form', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('link', { name: 'See what’s on' })).toHaveAttribute('href', '/events')
    expect(screen.getByText(/Everyone is welcome at our programmes/)).toBeInTheDocument()
  })

  it('hides data-driven sections when there is nothing to show', async () => {
    const empty = createEmptyApi()
    renderWithProviders(<HomePage />, { api: empty, session: { role: 'member', householdId: 'hh-sen', householdName: 'The Sens', name: 'Rina Sen', email: 'rina.sen@gmail.com' } })
    await screen.findByRole('heading', { name: 'Who we are' })
    expect(screen.queryByText('Next event')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Coming up' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Our year' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Photos from last year' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Moments from our year' })).not.toBeInTheDocument()
  })
})
