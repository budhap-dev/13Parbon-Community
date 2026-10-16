import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createTestApi, renderWithProviders } from '@/test/render'
import { AboutPage } from './AboutPage'

describe('AboutPage', () => {
  it('shows the logo, story, values, committee and questions', () => {
    renderWithProviders(<AboutPage />, { route: '/about' })
    expect(screen.getByRole('heading', { level: 1, name: 'About us' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /13Parbon Community logo/ })).toHaveAttribute('src', '/brand/13parbon-logo.jpeg')
    const story = screen.getByRole('region', { name: 'Our story' })
    expect(story).toHaveTextContent(/13Parbon began in Leeds in 2022/)
    // The piece has lists and a heading in it; flattening those to paragraphs would lose it.
    expect(within(story).getByRole('heading', { level: 3, name: /A Few Things That Make Us/ })).toBeInTheDocument()
    expect(within(story).getAllByRole('list')).toHaveLength(2)
    expect(within(story).getAllByRole('listitem')).toHaveLength(12)
    const values = screen.getByRole('region', { name: 'What we stand for' })
    expect(within(values).getAllByRole('heading', { level: 3 })).toHaveLength(4)
    const committee = screen.getByRole('region', { name: 'Current committee' })
    expect(within(committee).getByText('Cultural Secretary')).toBeInTheDocument()
    // Every seat is filled by a named person: no placeholders reach the page.
    expect(within(committee).getAllByRole('listitem')).toHaveLength(7)
    expect(committee).not.toHaveTextContent('[Name]')
    const members = screen.getByRole('region', { name: 'Our members' })
    expect(within(members).getAllByRole('listitem')).toHaveLength(31)
    expect(document.title).toBe('About us · 13Parbon Community')
  })

  it('answers questions on demand', async () => {
    renderWithProviders(<AboutPage />, { route: '/about' })
    const question = screen.getByText('Do I need to be Bengali?')
    const answer = screen.getByText(/If you enjoy the music/)
    expect(answer.closest('details')).not.toHaveAttribute('open')
    await userEvent.click(question)
    expect(answer.closest('details')).toHaveAttribute('open')
  })

  it('shows a face beside a name on the committee or the roll, where its owner added one', async () => {
    const api = createTestApi()
    api.people.publicPhotos = async () => [
      { name: 'Dalim Ghosh', photo: 'https://photos.13parbon.org.uk/full/person-a-abc.jpg' },
      { name: 'Somnath Das', photo: 'https://photos.13parbon.org.uk/full/person-b-def.jpg' },
    ]
    renderWithProviders(<AboutPage />, { route: '/about', api })
    const committee = screen.getByRole('region', { name: 'Current committee' })
    const members = screen.getByRole('region', { name: 'Our members' })
    // Decorative, like the rosette it replaces, so found by its address rather than by a name.
    await vi.waitFor(() =>
      expect(committee.querySelector('img[src$="/thumb/person-a-abc.jpg"]')).not.toBeNull(),
    )
    expect(members.querySelector('img[src$="/thumb/person-b-def.jpg"]')).not.toBeNull()
    // Everybody else keeps the rosette.
    expect(members.querySelectorAll('img')).toHaveLength(1)
  })
})
