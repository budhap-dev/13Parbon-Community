import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('explains the portal is not open and that membership is by invitation', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })
    expect(screen.getByRole('heading', { level: 1, name: 'Member sign-in' })).toBeInTheDocument()
    expect(screen.getByText(/sign in with Google/)).toBeInTheDocument()
    expect(screen.getByText(/no sign-up form/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Message the committee' })).toHaveAttribute('href', '/contact')
    expect(document.title).toBe('Member sign-in · 13Parbon Community')
  })
})
