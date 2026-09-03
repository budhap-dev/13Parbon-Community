import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'
import { THEME_STORAGE_KEY } from './themes'

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

  it('throws a helpful error outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/inside <ThemeProvider>/)
    spy.mockRestore()
  })
})
