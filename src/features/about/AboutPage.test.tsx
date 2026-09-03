import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { AboutPage } from './AboutPage'

describe('AboutPage', () => {
  it('shows the logo, story, values, committee and questions', () => {
    renderWithProviders(<AboutPage />, { route: '/about' })
    expect(screen.getByRole('heading', { level: 1, name: 'About us' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /13Parbon Community logo/ })).toHaveAttribute('src', '/brand/13parbon-logo.jpeg')
    expect(screen.getByRole('region', { name: 'Our story' })).toHaveTextContent(/A Bengali cultural association/)
    const values = screen.getByRole('region', { name: 'What we stand for' })
    expect(within(values).getAllByRole('heading', { level: 3 })).toHaveLength(4)
    const committee = screen.getByRole('region', { name: 'The committee' })
    expect(within(committee).getByText('Cultural secretary')).toBeInTheDocument()
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
})
