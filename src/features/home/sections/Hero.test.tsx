import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter } from 'react-router'
import { ThemeProvider, useTheme } from '@/app/theme/ThemeContext'
import type { ThemeName } from '@/app/theme/themes'
import { Hero } from './Hero'

function renderHero(theme: ThemeName) {
  return render(
    <MemoryRouter>
      <ThemeProvider initialTheme={theme}>
        <Hero />
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('Hero', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('assembles the logo from its three pieces', () => {
    renderHero('festival')
    const logo = screen.getByRole('img', { name: '13Parbon Community logo' })
    const pieces = Array.from(logo.querySelectorAll('img')).map((img) => img.dataset.piece)
    expect(pieces).toEqual(['arc', 'skyline', 'emblem'])
    expect(logo.querySelector('[data-piece="emblem"]')).toHaveAttribute('src', '/brand/logo/emblem.jpg')
  })

  it.each<[ThemeName, string]>([
    ['festival', 'alpona'],
    ['poila-boishakh', 'fish'],
    ['saraswati', 'veena'],
    ['holi', 'splash'],
    ['mahalaya', 'kash'],
  ])('draws the %s motif behind the hero', (theme, motif) => {
    const { container } = renderHero(theme)
    expect(container.querySelector(`[data-backdrop="${motif}"]`)).toBeInTheDocument()
    expect(container.querySelectorAll('[data-backdrop]')).toHaveLength(1)
  })

  it('reassembles the logo when the theme changes', async () => {
    function Switch() {
      const { setTheme } = useTheme()
      return (
        <button type="button" onClick={() => setTheme('holi')}>
          holi
        </button>
      )
    }
    render(
      <MemoryRouter>
        <ThemeProvider initialTheme="festival">
          <Hero />
          <Switch />
        </ThemeProvider>
      </MemoryRouter>,
    )
    const before = screen.getByRole('img', { name: '13Parbon Community logo' })
    await userEvent.click(screen.getByRole('button', { name: 'holi' }))
    const after = screen.getByRole('img', { name: '13Parbon Community logo' })
    expect(after).not.toBe(before)
  })

  it('reassembles the logo when the viewer comes back to home', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <Hero />
          <Link to="/">home</Link>
        </ThemeProvider>
      </MemoryRouter>,
    )
    const before = screen.getByRole('img', { name: '13Parbon Community logo' })
    await userEvent.click(screen.getByRole('link', { name: 'home' }))
    const after = screen.getByRole('img', { name: '13Parbon Community logo' })
    expect(after).not.toBe(before)
  })
})
