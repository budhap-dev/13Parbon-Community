import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoginPage } from './LoginPage'
import { TestProviders } from '@/test/render'

/**
 * The button is the only way into the portal, so whether it looks usable is not cosmetic.
 *
 * It carried `cursor: not-allowed` and `opacity: 0.55` on its base class rather than on
 * `:disabled`, so it looked unavailable even when it worked — and the only way to discover it
 * was live was to click something that looked like it would do nothing.
 */
describe('the Google button', () => {
  it('is enabled when sign-in is configured', () => {
    render(
      <TestProviders
        env={{
          VITE_SUPABASE_URL: 'https://project.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'anon-key',
          VITE_MEMBER_ALLOWLIST: 'someone@example.com',
        }}
      >
        <LoginPage />
      </TestProviders>,
    )
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeEnabled()
  })

  it('is disabled, and says why, when it is not', () => {
    render(
      <TestProviders>
        <LoginPage />
      </TestProviders>,
    )
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled()
    expect(screen.getByText(/Not switched on yet/)).toBeInTheDocument()
  })
})
