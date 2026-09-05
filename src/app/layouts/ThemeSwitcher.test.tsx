import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../theme/ThemeContext'
import { THEME_STORAGE_KEY } from '../theme/themes'
import { ThemeSwitcher } from './ThemeSwitcher'

function renderSwitcher() {
  return render(
    <ThemeProvider>
      <ThemeSwitcher />
      <p>outside</p>
    </ThemeProvider>,
  )
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('names the current theme and opens a list of all themes', async () => {
    renderSwitcher()
    const trigger = screen.getByRole('button', { name: 'Theme, currently Festival' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('radiogroup', { hidden: true })).not.toBeVisible()

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const options = screen.getAllByRole('radio')
    expect(options.map((o) => o.textContent)).toEqual([
      'FestivalSindoor red and marigold',
      'BoishakhiCream and red, like a lal-paar sari',
      'Saraswati PujaBasanti yellow with deep blue',
      'HoliMagenta and bright yellow',
      'MahalayaPre-dawn indigo and shiuli orange',
    ])
    expect(screen.getByRole('radio', { name: /Festival/ })).toHaveAttribute('aria-checked', 'true')
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
})
