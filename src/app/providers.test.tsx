import { render, screen } from '@testing-library/react'
import { createMockApi, useApi } from '@/lib/api'
import { useNow } from '@/lib/clock'
import { AppProviders } from './providers'
import { useTheme } from './theme/ThemeContext'

function Probe() {
  useApi()
  const { theme } = useTheme()
  return (
    <p>
      {useNow().toISOString()} {theme}
    </p>
  )
}

describe('AppProviders', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides the api, the clock and the theme', () => {
    const now = () => new Date('2026-09-03T10:00:00Z')
    render(
      <AppProviders api={createMockApi()} now={now} theme="holi">
        <Probe />
      </AppProviders>,
    )
    expect(screen.getByText('2026-09-03T10:00:00.000Z holi')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('holi')
  })
})
