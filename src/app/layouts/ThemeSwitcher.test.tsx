import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { defaultSettings } from '@/app/defaults'
import type { ApiClient } from '@/lib/api'
import { ClockProvider } from '@/lib/clock'
import { TestDataProviders, createTestApi } from '@/test/render'
import { ThemeProvider } from '../theme/ThemeContext'
import { THEME_STORAGE_KEY } from '../theme/themes'
import { ThemeSwitcher } from './ThemeSwitcher'

/** A day in no festival's colours: the committee's own theme shows. */
const QUIET_DAY = new Date('2026-09-01T12:00:00')
/** The day of Kali Puja, 8 November 2026. */
const KALI_PUJA = new Date('2026-11-08T12:00:00')

function renderSwitcher(now = QUIET_DAY) {
  return render(
    <ClockProvider now={() => now}>
      <ThemeProvider>
        <ThemeSwitcher />
        <p>outside</p>
      </ThemeProvider>
    </ClockProvider>,
  )
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('names the current theme and opens a list of all themes', async () => {
    renderSwitcher()
    const trigger = screen.getByRole('button', { name: 'Theme, currently following the calendar, Festival' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('radiogroup', { hidden: true })).not.toBeVisible()

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const options = screen.getAllByRole('radio')
    expect(options.map((o) => o.textContent)).toEqual([
      'Follow the calendarOur colours now, and each festival’s own around its days',
      'FestivalSindoor red and marigold',
      'BoishakhiCream and red, like a lal-paar sari',
      'Saraswati PujaBasanti yellow with deep blue',
      'HoliMagenta and bright yellow',
      'MahalayaPre-dawn indigo and shiuli orange',
      'KojagoriFull-moon blue and pale gold, for Lakshmi Puja',
      'DeepavaliA dark night lit by diyas, for Kali Puja',
      'BorodinWinter white, holly green and berry red',
    ])
    // Nobody has chosen yet, so the calendar is followed, and the committee's Festival is worn.
    expect(screen.getByRole('radio', { name: /Follow the calendar/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /^Festival/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('wears a festival’s theme around its day, and says so', async () => {
    renderSwitcher(KALI_PUJA)
    expect(document.documentElement.dataset.theme).toBe('deepavali')
    await userEvent.click(screen.getByRole('button', { name: 'Theme, currently following the calendar, Deepavali' }))
    expect(screen.getByRole('radio', { name: /Follow the calendar/ })).toHaveTextContent('Deepavali colours for Kali Puja, until 13 November')
  })

  it('offers the committee’s colours instead when the committee has turned the festivals off', async () => {
    const base = createTestApi()
    const off: ApiClient = { ...base, settings: { ...base.settings, get: async () => ({ ...defaultSettings, seasonalThemes: false }) } }
    render(
      <TestDataProviders api={off} now={KALI_PUJA}>
        <ThemeSwitcher />
      </TestDataProviders>,
    )
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('festival'))
    await userEvent.click(screen.getByRole('button', { name: /Theme/ }))
    expect(screen.getByRole('radio', { name: /Follow the website/ })).toHaveTextContent('The colours the committee has chosen')
    expect(screen.queryByRole('radio', { name: /Follow the calendar/ })).not.toBeInTheDocument()
  })

  it('goes back to following the calendar after a theme of one’s own', async () => {
    renderSwitcher(KALI_PUJA)
    await userEvent.click(screen.getByRole('button', { name: /Theme/ }))
    await userEvent.click(screen.getByRole('radio', { name: /Holi/ }))
    expect(document.documentElement.dataset.theme).toBe('holi')

    await userEvent.click(screen.getByRole('button', { name: /Theme/ }))
    await userEvent.click(screen.getByRole('radio', { name: /Follow the calendar/ }))
    expect(document.documentElement.dataset.theme).toBe('deepavali')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('applies and remembers the chosen theme, then closes', async () => {
    renderSwitcher()
    await userEvent.click(screen.getByRole('button', { name: /Theme/ }))
    await userEvent.click(screen.getByRole('radio', { name: /Holi/ }))

    expect(document.documentElement.dataset.theme).toBe('holi')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('holi')
    const trigger = screen.getByRole('button', { name: 'Theme, currently Holi' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('closes on Escape and on clicking outside', async () => {
    renderSwitcher()
    const trigger = screen.getByRole('button', { name: /Theme/ })
    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByText('outside'))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens upward when asked, for a switcher near the foot of the screen', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher align="start" direction="up" />
      </ThemeProvider>,
    )
    const panel = screen.getByRole('radiogroup', { hidden: true })
    expect(panel.className).toMatch(/panelUp/)
    expect(panel.className).toMatch(/panelStart/)
  })

  it('opens downward by default', () => {
    renderSwitcher()
    expect(screen.getByRole('radiogroup', { hidden: true }).className).not.toMatch(/panelUp/)
  })
})
