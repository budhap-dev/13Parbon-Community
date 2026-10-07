import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { defaultSettings } from '@/app/defaults'
import { createMockApi, type ApiClient } from '@/lib/api'
import { TestDataProviders } from '@/test/render'
import { PURPOSE_STORAGE_KEY, purposeNow, rememberPurpose } from './signInPurpose'

/**
 * The public sign-in, and the one interaction that had to be got right.
 *
 * There is one Supabase token for the tab and two doors using it. The members' door signs an
 * unrecognised address straight back out of Google — correct for somebody knocking at the
 * portal, and ruinous for somebody who has just signed in to put their name to a piece of
 * feedback and is about to press Send. Without the purpose marker the button on the feedback
 * form appears to do nothing at all, forever.
 */

const startGoogleSignIn = vi.fn(async (_config: unknown, _returnTo?: string) => {})
const signOutOfGoogle = vi.fn(async (_config: unknown) => {})

/** Whoever the fake Supabase client should say is signed in. Set per test. */
let currentUser: { email: string; user_metadata?: Record<string, string> } | null = null

vi.mock('./supabaseAuth', async (importOriginal) => {
  const real = await importOriginal<typeof import('./supabaseAuth')>()
  return {
    ...real,
    startGoogleSignIn: (config: unknown, returnTo?: string) => startGoogleSignIn(config, returnTo),
    signOutOfGoogle: (config: unknown) => signOutOfGoogle(config),
    authClient: async () => ({
      auth: {
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          cb('INITIAL_SESSION', currentUser ? { user: currentUser } : null)
          return { data: { subscription: { unsubscribe: () => {} } } }
        },
        getSession: async () => ({ data: { session: currentUser ? { user: currentUser } : null } }),
      },
    }),
  }
})

/** A project, and an allowlist that this visitor is emphatically not on. */
const configured = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
  VITE_MEMBER_ALLOWLIST: 'committee@example.com',
}

function withFeedbackOn(): ApiClient {
  const base = createMockApi()
  return {
    ...base,
    delivers: true,
    settings: { ...base.settings, get: async () => ({ ...defaultSettings, showFeedback: true }) },
  }
}

function renderFeedback(env: Record<string, string | undefined> = configured) {
  render(
    <TestDataProviders api={withFeedbackOn()} env={env}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/feedback'] })} />
    </TestDataProviders>,
  )
}

afterEach(() => {
  currentUser = null
  startGoogleSignIn.mockClear()
  signOutOfGoogle.mockClear()
  window.localStorage.removeItem(PURPOSE_STORAGE_KEY)
})

describe('remembering which door somebody used', () => {
  it('assumes the portal when nothing was recorded', () => {
    expect(purposeNow()).toBe('member')
  })

  it('remembers a feedback sign-in across the trip to Google', () => {
    rememberPurpose('feedback')
    expect(purposeNow()).toBe('feedback')
  })
})

describe('signing in to put a name to a note', () => {
  it('sends them to Google and brings them back to the feedback page', async () => {
    renderFeedback()
    await screen.findByRole('heading', { level: 1, name: 'What people say' })
    await userEvent.click(await screen.findByRole('button', { name: /Sign in with Google/ }))

    await waitFor(() => expect(startGoogleSignIn).toHaveBeenCalled())
    // Back here, not to the portal: returning to a sign-in they did not ask for, having lost
    // what they had typed, is how somebody stops leaving feedback.
    expect(startGoogleSignIn.mock.calls[0][1]).toBe('/feedback')
    expect(purposeNow()).toBe('feedback')
  })

  it('offers nothing to sign with in a build that has no project', async () => {
    renderFeedback({})
    await screen.findByRole('heading', { level: 1, name: 'What people say' })
    expect(await screen.findByText(/not switched on in this build/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign in with Google/ })).toBeDisabled()
  })
})

describe('coming back from Google as somebody the committee has never heard of', () => {
  it('keeps the session, so they can sign what they wrote', async () => {
    rememberPurpose('feedback')
    currentUser = { email: 'a.stranger@gmail.com', user_metadata: { full_name: 'Priya Sharma' } }
    renderFeedback()

    expect(await screen.findByText(/Signed in as Priya Sharma/)).toBeInTheDocument()
    // The members' gate must not have thrown them out on the way past.
    expect(signOutOfGoogle).not.toHaveBeenCalled()
    // And the label names exactly what will appear on the page, surname included.
    expect(screen.getByLabelText(/Put my name to it — “Priya Sharma”/)).toBeChecked()
  })

  it('still turns them away from the portal if that is what they came for', async () => {
    rememberPurpose('member')
    currentUser = { email: 'a.stranger@gmail.com', user_metadata: { full_name: 'Priya Sharma' } }
    render(
      <TestDataProviders api={withFeedbackOn()} env={configured}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/login'] })} />
      </TestDataProviders>,
    )
    // The invitation-only rule is unchanged: an unrecognised address knocking at the portal
    // is refused and signed out of Google, exactly as before.
    await waitFor(() => expect(signOutOfGoogle).toHaveBeenCalled())
    // Kindly, by first name, and saying what happens next rather than leaving them to ask.
    const panel = await screen.findByRole('status', { name: 'Thanks for coming, Priya.' })
    expect(within(panel).getByText('a.stranger@gmail.com')).toBeInTheDocument()
    expect(within(panel).getByText(/We have let the committee know you tried/)).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Message the committee' })).toHaveAttribute('href', '/contact')
    expect(within(panel).getByRole('button', { name: 'Use a different Google account' })).toBeEnabled()
    // The Google button it replaces is not offered beside it as well.
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument()
  })

  /**
   * Signing in and signing a note are two decisions, not one. Somebody may go through Google
   * — because that is the only way the form offers to prove anything — and still decide, at
   * the last moment, that they would rather this particular note went up unsigned.
   */
  it('still lets them send it anonymously after signing in', async () => {
    rememberPurpose('feedback')
    currentUser = { email: 'a.stranger@gmail.com', user_metadata: { full_name: 'Priya Sharma' } }
    const api = withFeedbackOn()
    const send = vi.spyOn(api.feedback, 'send')
    render(
      <TestDataProviders api={api} env={configured}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/feedback'] })} />
      </TestDataProviders>,
    )

    await screen.findByText(/Signed in as Priya Sharma/)
    await userEvent.click(screen.getByLabelText(/Put my name to it/))
    await userEvent.type(
      screen.getByLabelText(/what would you like to tell us/i),
      'Rather not have my name on this one, but it needed saying.',
    )
    // The button says which it will be, so nobody sends a signed note meaning to send an
    // anonymous one.
    await userEvent.click(screen.getByRole('button', { name: 'Send anonymously' }))

    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ signed: false })))
  })

  it('leaves them a visitor everywhere else on the site', async () => {
    rememberPurpose('feedback')
    currentUser = { email: 'a.stranger@gmail.com', user_metadata: { full_name: 'Priya Sharma' } }
    renderFeedback()
    await screen.findByText(/Signed in as Priya Sharma/)

    // No member session: the header offers no portal, and nothing behind the sign-in opened.
    expect(screen.queryByRole('link', { name: /portal/i })).not.toBeInTheDocument()
  })
})
