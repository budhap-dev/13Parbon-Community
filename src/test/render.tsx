import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { ApiProvider, createMockApi, type ApiClient } from '@/lib/api'
import { ClockProvider } from '@/lib/clock'
import { ThemeProvider } from '@/app/theme/ThemeContext'

/** Fixed clock for tests so relative fixture dates and countdowns are stable. */
export const TEST_NOW = new Date('2026-09-03T10:00:00')

export function createTestApi(): ApiClient {
  return createMockApi({ now: () => TEST_NOW })
}

type DataProps = { children: ReactNode; api?: ApiClient }

/** Query client, API and clock, without a router. Use with createMemoryRouter. */
export function TestDataProviders({ children, api = createTestApi() }: DataProps) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <ApiProvider api={api}>
        <ClockProvider now={() => TEST_NOW}>
          <ThemeProvider>{children}</ThemeProvider>
        </ClockProvider>
      </ApiProvider>
    </QueryClientProvider>
  )
}

type Props = DataProps & { route?: string }

/** Everything a component needs, including an in-memory router. */
export function TestProviders({ children, api, route = '/' }: Props) {
  return (
    <TestDataProviders api={api}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </TestDataProviders>
  )
}

type Options = Omit<RenderOptions, 'wrapper'> & { route?: string; api?: ApiClient }

export function renderWithProviders(ui: ReactElement, { route, api, ...options }: Options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders api={api} route={route}>
        {children}
      </TestProviders>
    ),
    ...options,
  })
}
