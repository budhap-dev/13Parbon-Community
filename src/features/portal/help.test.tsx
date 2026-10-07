import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { TAKEDOWN_PROMISE } from '@/domain/contact'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { expectNoAxeViolations } from '@/test/axe'
import { TestDataProviders } from '@/test/render'

const member: Session = previewAccounts[0]

function renderAt(path: string, session?: Session) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const { container } = render(
    <TestDataProviders session={session}>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  return { router, container }
}

describe('the members’ help page', () => {
  it('is in a member’s own menu', async () => {
    renderAt('/portal', member)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    const nav = screen.getByRole('navigation', { name: 'Your household' })
    expect(within(nav).getByRole('link', { name: /Help/ })).toHaveAttribute('href', '/portal/help')
  })

  it('is behind the sign-in like the rest of the portal', async () => {
    const { router } = renderAt('/portal/help')
    await screen.findByRole('heading', { level: 1 })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('covers each part of the portal, with a link to jump to it', async () => {
    renderAt('/portal/help', member)
    await screen.findByRole('heading', { level: 1, name: 'Help' })
    const jump = screen.getByRole('navigation', { name: 'On this page' })
    for (const [name, id] of [
      ['Getting in', 'getting-in'],
      ['Your dashboard', 'dashboard'],
      ['My household', 'household'],
      ['Polls and quizzes', 'play'],
      ['Photographs', 'photos'],
      ['Your privacy, in one breath', 'privacy'],
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
      expect(within(jump).getByRole('link', { name })).toHaveAttribute('href', `#${id}`)
    }
  })

  /*
   * The promises that matter, said the way the screens and the privacy notice say them. A guide
   * that drifts from the portal is worse than none, so these are pinned here.
   */
  it('says what the portal actually does', async () => {
    renderAt('/portal/help', member)
    await screen.findByRole('heading', { level: 1, name: 'Help' })
    expect(screen.getByText(/One vote and one go per household/)).toBeInTheDocument()
    expect(screen.getByText(/nobody — the committee included — can see how your household voted/)).toBeInTheDocument()
    expect(screen.getAllByText(/Children's names are never shown publicly/).length).toBeGreaterThan(0)
    expect(screen.getByText(new RegExp(TAKEDOWN_PROMISE))).toBeInTheDocument()
  })

  it('opens an answer when its question is pressed', async () => {
    renderAt('/portal/help', member)
    const question = await screen.findByText(/Can our household vote twice/)
    const details = question.closest('details')!
    expect(details).not.toHaveAttribute('open')
    await userEvent.click(question)
    expect(details).toHaveAttribute('open')
  })

  it('sends somebody still stuck to the committee', async () => {
    renderAt('/portal/help', member)
    await screen.findByRole('heading', { level: 1, name: 'Help' })
    expect(screen.getByRole('link', { name: 'Message the committee' })).toHaveAttribute('href', '/contact')
  })

  it('keeps the emoji away from screen readers', async () => {
    const { container } = renderAt('/portal/help', member)
    await screen.findByRole('heading', { level: 1, name: 'Help' })
    // Every emoji sits beside words saying the same thing; read aloud, "waving hand sign" is noise.
    expect(screen.getByRole('heading', { level: 2, name: 'Getting in' }).textContent).toBe('Getting in')
    await expectNoAxeViolations(container)
  })
})
