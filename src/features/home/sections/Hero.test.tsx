import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ThemeProvider } from '@/app/theme/ThemeContext'
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
})
