import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

/**
 * The two things that went wrong the first time a real Google sign-in came back.
 *
 * Both were invisible against the mock, because nothing there takes a moment to work out who
 * is here — the session is simply known from the first render.
 */
function renderAt(path: string, env: Record<string, string | undefined> = {}) {
  render(
    <TestDataProviders env={env}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

/** Enough for readAuthConfig to say sign-in is configured. */
const configured = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
  VITE_MEMBER_ALLOWLIST: 'someone@example.com',
}

describe('coming back from Google', () => {
  it('waits rather than deciding nobody is here', () => {
    renderAt('/portal', configured)
    // Checked on the first render rather than awaited: the wait is meant to be brief, so a
    // findBy here would race the very thing it is testing and pass or fail by timing.
    expect(screen.getByText('Signing you in…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /sign-in/i })).not.toBeInTheDocument()
  })

  it('does not wait forever when nobody is signed in', async () => {
    renderAt('/portal', configured)
    // The listener may never fire if there is nothing stored and nothing in the URL, so it
    // asks once. Otherwise "checking" is a screen nobody ever leaves.
    await waitFor(() => expect(screen.queryByText('Signing you in…')).not.toBeInTheDocument(), { timeout: 3000 })
  })
})

describe('the sign-in page when somebody is already signed in', () => {
  it('sends a member on to the portal rather than showing them a button', async () => {
    render(
      <TestDataProviders session={previewAccounts[0]}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/login'] })} />
      </TestDataProviders>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
  })

  it('sends the committee to the committee pages', async () => {
    render(
      <TestDataProviders session={previewAccounts[1]}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/login'] })} />
      </TestDataProviders>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Committee overview' })).toBeInTheDocument()
  })
})
