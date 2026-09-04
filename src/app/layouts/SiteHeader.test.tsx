import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { TestDataProviders } from '@/test/render'
import { ThemeProvider } from '../theme/ThemeContext'
import { SiteHeader } from './SiteHeader'

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
    // Parked until everyone in the photographs has been asked.
    expect(screen.queryByRole('link', { name: 'Gallery' })).not.toBeInTheDocument()
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
    // Comes from package.json at build time, so it can never drift from the release.
    expect(screen.getByText(new RegExp(`v${__APP_VERSION__.replace(/\./g, '\\.')}$`))).toBeInTheDocument()
  })
})
