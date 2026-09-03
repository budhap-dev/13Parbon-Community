import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ThemeProvider } from '../theme/ThemeContext'
import { SiteHeader } from './SiteHeader'

describe('SiteHeader', () => {
  it('links the brand home and lists the public navigation', () => {
    render(
      <MemoryRouter initialEntries={['/gallery']}>
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
    expect(screen.getByRole('link', { name: 'Gallery' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Join us' })).toHaveAttribute('href', '/join')
    expect(screen.getByRole('button', { name: /^Theme/ })).toBeInTheDocument()
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
