import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'
import { defaultSettings } from '@/app/defaults'
import type { ApiClient } from '@/lib/api'
import { TestDataProviders, createTestApi } from '@/test/render'
import { SITE_SEASONS_KEY, SITE_THEME_BASE_KEY, SITE_THEME_STORAGE_KEY, SITE_THEME_UNTIL_KEY, THEME_STORAGE_KEY } from './themes'

function Probe() {
  const { theme, setTheme } = useTheme()
  return (
    <button type="button" onClick={() => setTheme('holi')}>
      {theme}
    </button>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts from the initial theme, applies it, and persists changes', async () => {
    render(
      <ThemeProvider initialTheme="mahalaya">
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByRole('button')).toHaveTextContent('mahalaya')
    expect(document.documentElement.dataset.theme).toBe('mahalaya')
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('holi')
    expect(document.documentElement.dataset.theme).toBe('holi')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('holi')
  })

  it('prefers the stored theme over the initial one', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'saraswati')
    render(
      <ThemeProvider initialTheme="festival">
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByRole('button')).toHaveTextContent('saraswati')
  })

  describe('by the calendar', () => {
    const KALI_PUJA = new Date('2026-11-08T12:00:00')
    const committee = (settings: Partial<typeof defaultSettings>): ApiClient => {
      const base = createTestApi()
      return { ...base, settings: { ...base.settings, get: async () => ({ ...defaultSettings, ...settings }) } }
    }

    it('wears the festival’s theme over the committee’s, and remembers it for the next visit', async () => {
      render(
        <TestDataProviders api={committee({ defaultTheme: 'borodin' })} now={KALI_PUJA}>
          <span />
        </TestDataProviders>,
      )
      await waitFor(() => expect(localStorage.getItem(SITE_THEME_STORAGE_KEY)).toBe('deepavali'))
      expect(document.documentElement.dataset.theme).toBe('deepavali')
      // And when it stops, and what comes after, for a visit once it is over.
      expect(localStorage.getItem(SITE_THEME_UNTIL_KEY)).toBe('2026-11-13')
      expect(localStorage.getItem(SITE_THEME_BASE_KEY)).toBe('borodin')
    })

    it('does not open a returning visitor in a festival that is over', () => {
      // Last here for Kali Puja; back a fortnight later, before the settings have arrived.
      localStorage.setItem(SITE_THEME_STORAGE_KEY, 'deepavali')
      localStorage.setItem(SITE_THEME_BASE_KEY, 'borodin')
      localStorage.setItem(SITE_SEASONS_KEY, 'on')
      localStorage.setItem(SITE_THEME_UNTIL_KEY, '2026-11-13')
      const never: ApiClient = { ...createTestApi(), settings: { ...createTestApi().settings, get: () => new Promise(() => {}) } }
      render(
        <TestDataProviders api={never} now={new Date('2026-11-20T12:00:00')}>
          <span />
        </TestDataProviders>,
      )
      expect(document.documentElement.dataset.theme).toBe('borodin')
    })

    it('wears the committee’s theme when the committee has turned the switch off', async () => {
      render(
        <TestDataProviders api={committee({ defaultTheme: 'borodin', seasonalThemes: false })} now={KALI_PUJA}>
          <span />
        </TestDataProviders>,
      )
      await waitFor(() => expect(document.documentElement.dataset.theme).toBe('borodin'))
    })

    it('leaves a visitor’s own choice alone', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'holi')
      render(
        <TestDataProviders api={committee({})} now={KALI_PUJA}>
          <span />
        </TestDataProviders>,
      )
      await waitFor(() => expect(localStorage.getItem(SITE_THEME_STORAGE_KEY)).toBe('deepavali'))
      expect(document.documentElement.dataset.theme).toBe('holi')
    })
  })

  it('throws a helpful error outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/inside <ThemeProvider>/)
    spy.mockRestore()
  })
})
