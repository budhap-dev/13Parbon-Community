import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { previewAccounts, previewEnabled } from './previewAccounts'
import { canSee, SESSION_STORAGE_KEY, SessionProvider, useSession, useSignedIn } from './session'

function Probe() {
  const { session, signIn, signOut } = useSession()
  const who = useSignedIn()
  return (
    <>
      <p>{`${session.role}${who ? ` · ${who.householdName}` : ''}`}</p>
      <button type="button" onClick={() => signIn(previewAccounts[1])}>
        in
      </button>
      <button type="button" onClick={signOut}>
        out
      </button>
    </>
  )
}

describe('session', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('starts as a visitor with no household', () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(screen.getByText('visitor')).toBeInTheDocument()
  })

  it('signs in, remembers it, and signs out again', async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'in' }))
    expect(screen.getByText('admin · The Chatterjees')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain('hh-chatterjee')
    await userEvent.click(screen.getByRole('button', { name: 'out' }))
    expect(screen.getByText('visitor')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('picks a stored session back up, and ignores a broken one', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(previewAccounts[0]))
    const { unmount } = render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(screen.getByText('member · The Sens')).toBeInTheDocument()
    unmount()

    sessionStorage.setItem(SESSION_STORAGE_KEY, '{"role":"wizard"}')
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(screen.getByText('visitor')).toBeInTheDocument()
  })

  it('decides what each role may see', () => {
    expect(canSee('public', 'visitor')).toBe(true)
    expect(canSee('members', 'visitor')).toBe(false)
    expect(canSee('members', 'member')).toBe(true)
    expect(canSee('admins', 'member')).toBe(false)
    expect(canSee('admins', 'admin')).toBe(true)
  })

  it('offers the preview only while developing, or when asked for by name', () => {
    expect(previewEnabled(true, '')).toBe(true)
    expect(previewEnabled(false, '')).toBe(false)
    expect(previewEnabled(false, '?preview')).toBe(true)
    expect(previewEnabled(false, '?other=1')).toBe(false)
  })
})
