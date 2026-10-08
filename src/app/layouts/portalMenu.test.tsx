import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { TestDataProviders } from '@/test/render'

const member: Session = previewAccounts[0]
const admin: Session = previewAccounts[1]

function renderAt(path: string, session: Session = admin) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <TestDataProviders session={session}>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  return router
}

const menuButton = () => screen.findByRole('button', { name: 'Open menu' })
const drawer = () => screen.getByRole('complementary', { name: 'Portal menu' })

/**
 * The portal's menu on a phone: the sidebar as a drawer, out from the left.
 *
 * jsdom draws no layout, so what is checked here is the behaviour — what opens it, what shuts
 * it, where the focus goes, and that the page behind is out of reach while it is open. How it
 * looks at 390px wide is checked in a browser.
 */
describe('the portal’s menu on a phone', () => {
  it('opens from the bar, onto its close button', async () => {
    renderAt('/admin')
    const toggle = await menuButton()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', drawer().id)

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(drawer()).getByRole('button', { name: 'Close menu' })).toHaveFocus()
  })

  it('opens from the top every time, wherever its list was left', async () => {
    renderAt('/admin')
    const toggle = await menuButton()
    await userEvent.click(toggle)
    drawer().scrollTop = 400
    await userEvent.keyboard('{Escape}')

    await userEvent.click(toggle)
    expect(drawer().scrollTop).toBe(0)
  })

  it('puts the page behind out of reach while it is open, and gives it back after', async () => {
    renderAt('/admin')
    await userEvent.click(await menuButton())
    expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert')
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.click(within(drawer()).getByRole('button', { name: 'Close menu' }))
    expect(screen.getByRole('main')).not.toHaveAttribute('inert')
    expect(document.body.style.overflow).toBe('')
  })

  it('shuts on Escape, and the focus goes back to the menu button', async () => {
    renderAt('/admin')
    const toggle = await menuButton()
    await userEvent.click(toggle)
    await userEvent.keyboard('{Escape}')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(toggle).toHaveFocus())
  })

  it('shuts when one of its links is followed', async () => {
    const router = renderAt('/admin')
    const toggle = await menuButton()
    await userEvent.click(toggle)
    await userEvent.click(within(drawer()).getByRole('link', { name: /^People/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/people'))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('shuts on a link to the screen you are already on, too', async () => {
    renderAt('/admin')
    const toggle = await menuButton()
    await userEvent.click(toggle)
    await userEvent.click(within(drawer()).getByRole('link', { name: /^Overview/ }))

    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'))
  })

  it('slides shut when pushed back to the left with a finger', async () => {
    renderAt('/admin')
    const toggle = await menuButton()
    await userEvent.click(toggle)
    const side = drawer()
    fireEvent.touchStart(side, { touches: [{ clientX: 280, clientY: 400 }] })
    fireEvent.touchMove(side, { touches: [{ clientX: 200, clientY: 402 }] })
    // It follows the finger while it is down.
    expect(side.style.transform).toBe('translateX(-80px)')
    fireEvent.touchMove(side, { touches: [{ clientX: 60, clientY: 405 }] })
    fireEvent.touchEnd(side, { touches: [] })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(side.style.transform).toBe('')
  })

  it('stays open for a finger moving up and down, which is the drawer scrolling', async () => {
    renderAt('/admin')
    const toggle = await menuButton()
    await userEvent.click(toggle)
    const side = drawer()
    fireEvent.touchStart(side, { touches: [{ clientX: 200, clientY: 600 }] })
    fireEvent.touchMove(side, { touches: [{ clientX: 190, clientY: 400 }] })
    fireEvent.touchMove(side, { touches: [{ clientX: 120, clientY: 250 }] })
    fireEvent.touchEnd(side, { touches: [] })

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(side.style.transform).toBe('')
  })

  it('has the search in the bar for the committee', async () => {
    renderAt('/admin')
    await menuButton()
    const bar = screen.getByRole('banner')
    await userEvent.click(within(bar).getByRole('button', { name: 'Search' }))
    expect(await screen.findByRole('dialog', { name: 'Search the portal' })).toBeInTheDocument()
  })

  it('has no search in the bar for a member', async () => {
    renderAt('/portal', member)
    await menuButton()
    expect(within(screen.getByRole('banner')).queryByRole('button', { name: 'Search' })).not.toBeInTheDocument()
  })
})

describe('the portal’s header and footer', () => {
  it('says where you are, down to the screen inside a section', async () => {
    renderAt('/admin/events')
    const here = await screen.findByLabelText('You are in')
    expect(here).toHaveTextContent('Committee/Events')

    renderAt('/portal/play')
    expect((await screen.findAllByLabelText('You are in')).at(-1)).toHaveTextContent('Your household/Vote and play')
  })

  it('offers the public site, in a new tab, from every screen', async () => {
    renderAt('/admin')
    const link = within(await screen.findByRole('banner')).getByRole('link', { name: /View the website/ })
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('ends every page with whose it is, the year, and which version is running', async () => {
    renderAt('/admin')
    const footer = await screen.findByRole('contentinfo')
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} 13Parbon Community`)
    expect(footer).toHaveTextContent(`Portal v${__APP_VERSION__}`)
    expect(within(footer).getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy')
  })
})

describe('the committee’s menu, in sections', () => {
  const committee = () => screen.findByRole('navigation', { name: 'Committee' })

  it('groups the screens under a heading each, so nobody reads thirteen names to find one', async () => {
    renderAt('/admin')
    const nav = await committee()
    for (const heading of ['Community', 'What’s on', 'The website']) {
      expect(within(nav).getByText(heading)).toBeInTheDocument()
    }
    // Two of the website's, to show they landed together.
    expect(within(nav).getByRole('link', { name: /Sponsors/ })).toHaveAttribute('href', '/admin/sponsors')
    expect(within(nav).getByRole('link', { name: /Pages and settings/ })).toHaveAttribute('href', '/admin/content')
  })

  it('folds their own household away while they are on the committee’s screens', async () => {
    renderAt('/admin')
    const household = await screen.findByRole('navigation', { name: 'Your household' })
    expect(household.querySelector('details')).not.toHaveAttribute('open')
    // Opened on a press, as any disclosure is.
    await userEvent.click(within(household).getByText('Your household'))
    expect(household.querySelector('details')).toHaveAttribute('open')
  })

  it('has it open whenever they are on one of its screens, so where they are is never hidden', async () => {
    renderAt('/portal/household')
    const household = await screen.findByRole('navigation', { name: 'Your household' })
    expect(household.querySelector('details')).toHaveAttribute('open')
  })

  it('shows a member their household plainly, with nothing folded', async () => {
    renderAt('/portal', member)
    const household = await screen.findByRole('navigation', { name: 'Your household' })
    expect(household.querySelector('details')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Committee' })).not.toBeInTheDocument()
  })
})
