import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { createEmptyApi, TestDataProviders } from '@/test/render'
import type { ApiClient } from '@/lib/api'

const member: Session = previewAccounts[0]
const admin: Session = previewAccounts[1]

function renderAt(path: string, session?: Session, api?: ApiClient) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <TestDataProviders session={session} api={api}>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  return router
}

describe('portal access', () => {
  it('sends a visitor to sign in', async () => {
    const router = renderAt('/portal')
    expect(await screen.findByRole('heading', { level: 1, name: 'Member sign-in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('keeps a member out of the committee section', async () => {
    const router = renderAt('/admin', member)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(router.state.location.pathname).toBe('/portal')
  })

  it('shows a member their own navigation only', async () => {
    renderAt('/portal', member)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(screen.getByRole('navigation', { name: 'Your household' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Committee' })).not.toBeInTheDocument()
    expect(screen.getByText('Rina Sen')).toBeInTheDocument()
    expect(screen.getByText(/made-up data/)).toBeInTheDocument()
  })

  it('gives an admin both sections and signs them out again', async () => {
    const router = renderAt('/admin', admin)
    await screen.findByRole('heading', { level: 1, name: 'Committee overview' })
    expect(screen.getByRole('navigation', { name: 'Your household' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Committee' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Member sign-in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})

describe('member pages', () => {
  it('leads the dashboard with the next event and whether the household has registered', async () => {
    renderAt('/portal', member)
    const feature = (await screen.findByRole('heading', { level: 2, name: 'Cultural programme' })).closest('section')!
    expect(within(feature).getByText(/has not registered yet/)).toBeInTheDocument()
    expect(within(feature).getByText('37')).toBeInTheDocument()
    expect(within(feature).getByRole('link', { name: 'Register the household' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Active' })).toBeInTheDocument()
  })

  it('shows the household, its people and the sharing choices', async () => {
    renderAt('/portal/household', member)
    expect(await screen.findByRole('heading', { level: 1, name: 'My household' })).toBeInTheDocument()
    expect(screen.getByText('Mira Sen')).toBeInTheDocument()
    expect(screen.getByText('Child, 7')).toBeInTheDocument()
    expect(screen.getByLabelText('List us in the directory: on')).toBeInTheDocument()
    expect(screen.getByLabelText('Show our phone: off')).toBeInTheDocument()
    expect(screen.getByText('rina.sen@gmail.com')).toBeInTheDocument()
  })

  it('lists only households that opted in, and never a child by name', async () => {
    renderAt('/portal/directory', member)
    const az = (await screen.findByRole('heading', { name: 'A to Z' })).closest('section')!
    const names = within(az)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '')
    expect(names.some((n) => n.includes('The Sens'))).toBe(true)
    expect(names.some((n) => n.includes('The Mitras'))).toBe(false)
    expect(names.join(' ')).not.toContain('Mira')
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('lists the documents newest first', async () => {
    renderAt('/portal/documents', member)
    const rows = await screen.findAllByRole('row')
    expect(rows[1]).toHaveTextContent('Stage plan and equipment list')
    expect(rows[1]).toHaveTextContent('Resources')
    expect(rows[1]).toHaveTextContent('3 September 2026')
  })

  it('says so plainly when there is nothing to show', async () => {
    renderAt('/portal/documents', member, createEmptyApi())
    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument()
  })
})

describe('committee pages', () => {
  it('counts what needs attention and how the event is filling', async () => {
    renderAt('/admin', admin)
    expect(await screen.findByRole('heading', { level: 1, name: 'Committee overview' })).toBeInTheDocument()
    expect(await screen.findByText('priya.dutta@gmail.com')).toBeInTheDocument()
    const stats = screen.getByText('Waiting on you').closest('div')!
    expect(within(stats).getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/6 have signed in, 2 admins/)).toBeInTheDocument()
  })

  it('shows who tried to sign in and every household with its role', async () => {
    renderAt('/admin/people', admin)
    const attempts = (await screen.findByRole('heading', { name: 'Tried to sign in, not on the list' })).closest('section')!
    expect(within(attempts).getByText('amit.bose@gmail.com')).toBeInTheDocument()
    const members = screen.getByRole('heading', { name: 'Members' }).closest('section')!
    expect(within(members).getAllByText('Admin')).toHaveLength(2)
    expect(within(members).getAllByText('Never signed in')).toHaveLength(2)
    expect(within(members).getByText('Lapsed')).toBeInTheDocument()
  })

  it('adds up the headcount for the caterer', async () => {
    renderAt('/admin/events', admin)
    expect(await screen.findByRole('heading', { level: 1, name: 'Who is coming' })).toBeInTheDocument()
    const regs = screen.getByRole('heading', { name: 'Registrations' }).closest('section')!
    expect(await within(regs).findByText('The Roys')).toBeInTheDocument()
    const meals = screen.getByText('Meals to plan').closest('div')!
    expect(within(meals).getByText('13')).toBeInTheDocument()
    expect(within(regs).getByText('Wheelchair access needed')).toBeInTheDocument()
  })

  it('links the separate event planner, and says what each tool is for', async () => {
    renderAt('/admin/events', admin)
    const sidebar = await screen.findByRole('navigation', { name: 'Other tools' })
    const link = within(sidebar).getByRole('link', { name: /Event planning/ })
    expect(link).toHaveAttribute('href', 'https://13parbon-event-management.vercel.app/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
    const panel = screen.getByRole('heading', { level: 2, name: 'Event planning' }).closest('section')!
    expect(within(panel).getByText(/counts who is coming; the planner tracks/)).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /Open the planner/ })).toHaveAttribute(
      'href',
      'https://13parbon-event-management.vercel.app/',
    )
  })

  it('keeps the planner in reach on every committee page', async () => {
    for (const path of ['/admin', '/admin/people', '/admin/content']) {
      const { unmount } = render(<div />)
      unmount()
      renderAt(path, admin)
      const sidebar = await screen.findByRole('navigation', { name: 'Other tools' })
      expect(within(sidebar).getByRole('link', { name: /Event planning/ })).toBeInTheDocument()
      cleanup()
    }
  })

  it('shows the planner only to the committee', async () => {
    renderAt('/portal', member)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(screen.queryByRole('navigation', { name: 'Other tools' })).not.toBeInTheDocument()
  })

  it('counts the gaps still showing on the public site', async () => {
    renderAt('/admin/content', admin)
    expect(await screen.findByText(/24 gaps still showing publicly/)).toBeInTheDocument()
    expect(screen.getByText('Home page')).toBeInTheDocument()
  })

  it('opens a message from the inbox', async () => {
    renderAt('/admin/messages', admin)
    expect(await screen.findByRole('heading', { level: 2, name: 'Parking on the night' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /New to the area/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'New to the area' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reply by email' })).toHaveAttribute('href', 'mailto:ruma@example.com')
  })
})

describe('preview sign-in', () => {
  it('is offered when asked for by name, and gets you in', async () => {
    const router = renderAt('/login?preview')
    const account = await screen.findByRole('button', { name: /Debashis Chatterjee/ })
    await userEvent.click(account)
    expect(router.state.location.pathname).toBe('/admin')
    expect(await screen.findByRole('heading', { level: 1, name: 'Committee overview' })).toBeInTheDocument()
  })

  it('is not offered to an ordinary visitor', async () => {
    renderAt('/login')
    await screen.findByRole('heading', { level: 1, name: 'Member sign-in' })
    expect(screen.queryByRole('heading', { name: 'Walk through the portal' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled()
  })
})
