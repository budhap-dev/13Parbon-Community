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
        <MemoryRouter initialEntries={['/news']}>
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
    expect(screen.getByRole('link', { name: 'News' })).toHaveAttribute('aria-current', 'page')
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
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Main' }).className).toContain('navOpen')
  })

  it('pins the next event under the wordmark, on the home page only', async () => {
    render(
      <TestDataProviders>
        <MemoryRouter>
          <ThemeProvider>
            <SiteHeader />
          </ThemeProvider>
        </MemoryRouter>
      </TestDataProviders>,
    )
    const strip = await screen.findByRole('link', { name: /Cultural programme/ })
    expect(strip).toHaveAttribute('href', '/events/mahalaya-cultural-programme-2026')
    // Inside the header, so the two move together when the bar slides away.
    expect(screen.getByRole('banner')).toContainElement(strip)
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
})
