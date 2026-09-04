import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ThemeProvider } from '../theme/ThemeContext'
import { SiteHeader } from './SiteHeader'

describe('SiteHeader', () => {
  it('links the brand home and lists the public navigation', () => {
    render(
      <MemoryRouter initialEntries={['/news']}>
        <ThemeProvider>
          <SiteHeader />
        </ThemeProvider>
      </MemoryRouter>,
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
      <MemoryRouter>
        <ThemeProvider>
          <SiteHeader />
        </ThemeProvider>
      </MemoryRouter>,
    )
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Main' }).className).toContain('navOpen')
  })
})
