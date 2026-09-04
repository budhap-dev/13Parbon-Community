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

  it('says sign-in is not switched on when this build has no project', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled()
    expect(screen.getByText(/Not switched on yet/)).toBeInTheDocument()
  })

  it('offers the button once a project and an allowlist are configured', () => {
    renderWithProviders(<LoginPage />, {
      route: '/login',
      env: {
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon',
        VITE_MEMBER_ALLOWLIST: 'dev@example.com',
      },
    })
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeEnabled()
    expect(screen.queryByText(/Not switched on yet/)).not.toBeInTheDocument()
  })

  it('leaves the button off when a project is set but nobody is allowed in', () => {
    // The half-configured case: better to say it is off than to sign someone in and out again.
    renderWithProviders(<LoginPage />, {
      route: '/login',
      env: { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' },
    })
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled()
  })
})
