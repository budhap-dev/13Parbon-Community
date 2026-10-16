import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { TestDataProviders } from '@/test/render'
import { ThemeProvider } from '../theme/ThemeContext'
import { SiteHeader } from './SiteHeader'
import { versionLabel } from '../version'

describe('SiteHeader', () => {
  it('links the brand home and lists the public navigation', () => {
    render(
      <TestDataProviders>
        <MemoryRouter initialEntries={['/events']}>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    const brand = screen.getByRole('link', { name: '13Parbon Community home' })
    expect(brand).toHaveAttribute('href', '/')
    expect(brand.querySelector('img')).toHaveAttribute('src', '/brand/13parbon-emblem.jpg')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('aria-current', 'page')
    // Parked until there is real news to carry: the route still works, it is not advertised.
    expect(screen.queryByRole('link', { name: 'News' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gallery' })).toHaveAttribute('href', '/gallery')
    // Parked for the MVP: the route still works, it is simply not advertised.
    expect(screen.queryByRole('link', { name: 'Member sign-in' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Theme/ })).toBeInTheDocument()
    expect(screen.getByRole('banner')).not.toHaveAttribute('data-hidden')
  })

  it('toggles the mobile menu', async () => {
    render(
      // On the home route the header carries the next-event strip, which reads the client.
      <TestDataProviders>
        <MemoryRouter>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Main' }).className).toContain('navOpen')

    // The drawer carries its own way out, and Escape closes it from anywhere.
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    await userEvent.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the mobile menu with a swipe back out to the right', async () => {
    render(
      <TestDataProviders>
        <MemoryRouter>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    await userEvent.click(toggle)
    const nav = screen.getByRole('navigation', { name: 'Main' })

    // Pushed the wrong way it stays put: it came in from the right, so that is the way out.
    fireEvent.touchStart(nav, { touches: [{ clientX: 100, clientY: 400 }] })
    fireEvent.touchMove(nav, { touches: [{ clientX: 20, clientY: 402 }] })
    expect(nav.style.transform).toBe('translateX(0px)')
    fireEvent.touchEnd(nav, { touches: [] })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.touchStart(nav, { touches: [{ clientX: 100, clientY: 400 }] })
    fireEvent.touchMove(nav, { touches: [{ clientX: 180, clientY: 402 }] })
    // It follows the finger while it is down.
    expect(nav.style.transform).toBe('translateX(80px)')
    fireEvent.touchMove(nav, { touches: [{ clientX: 320, clientY: 405 }] })
    fireEvent.touchEnd(nav, { touches: [] })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(nav.style.transform).toBe('')
  })

  it('keeps the next-event strip parked, even on the home page', async () => {
    render(
      <TestDataProviders>
        <MemoryRouter>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    await screen.findByRole('navigation', { name: 'Main' })
    // Parked at the committee's request. The home-page condition is still there underneath,
    // so one flag brings it back.
    expect(screen.queryByRole('link', { name: /Cultural programme/ })).not.toBeInTheDocument()
  })

  it('leaves the strip off every other page', async () => {
    render(
      <TestDataProviders>
        <MemoryRouter initialEntries={['/about']}>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    await screen.findByRole('navigation', { name: 'Main' })
    expect(screen.queryByRole('link', { name: /Cultural programme/ })).not.toBeInTheDocument()
  })

  it('offers one tap home from every page but the home page', async () => {
    const { unmount } = render(
      <TestDataProviders>
        <MemoryRouter initialEntries={['/about']}>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/')
    unmount()

    render(
      <TestDataProviders>
        <MemoryRouter>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    expect(screen.queryByRole('link', { name: 'Back to the home page' })).not.toBeInTheDocument()
  })

  it('stamps the version at the foot of the drawer', async () => {
    render(
      <TestDataProviders>
        <MemoryRouter>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    // Comes from package.json and the commit at build time, so it can never drift from the release.
    expect(screen.getByText(new RegExp(`${versionLabel.replace(/[.·]/g, '\\$&')}$`))).toBeInTheDocument()
    expect(versionLabel).toMatch(new RegExp(`^v${__APP_VERSION__.replace(/\./g, '\\.')}( · [0-9a-f]{7})?$`))
  })

  /*
   * With every part of the site switched on, the row of links ran into the name at a laptop's
   * width: the switch to the drawer was a fixed width, chosen when there were five links. Now
   * the header measures its row and folds it into the drawer when it does not fit.
   */
  describe('when the links do not fit in a row', () => {
    const widths = { scroll: 0, client: 0 }
    beforeEach(() => {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          callback: () => void
          constructor(callback: () => void) {
            this.callback = callback
          }
          observe() {
            this.callback()
          }
          disconnect() {}
        },
      )
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => widths.scroll)
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => widths.client)
    })
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    const draw = () =>
      render(
        <TestDataProviders>
          <MemoryRouter initialEntries={['/events']}>
            <ThemeProvider>
              <SiteHeader />
            </ThemeProvider>
          </MemoryRouter>
        </TestDataProviders>,
      )

    it('folds them into the drawer', () => {
      Object.assign(widths, { scroll: 1300, client: 1000 })
      draw()
      expect(screen.getByRole('banner')).toHaveClass('compact')
    })

    it('leaves them in a row when they fit', () => {
      Object.assign(widths, { scroll: 1000, client: 1000 })
      draw()
      expect(screen.getByRole('banner')).not.toHaveClass('compact')
    })
  })
})
