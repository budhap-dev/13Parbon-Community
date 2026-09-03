import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { ApiProvider, createMockApi, type ApiClient } from '@/lib/api'
import { ClockProvider } from '@/lib/clock'
import { ThemeProvider } from '@/app/theme/ThemeContext'
import { SessionProvider, type Session } from '@/lib/auth/session'

/** Fixed clock for tests so relative fixture dates and countdowns are stable. */
export const TEST_NOW = new Date('2026-09-03T10:00:00')

export function createTestApi(): ApiClient {
  return createMockApi({ now: () => TEST_NOW })
}

/**
 * A client where every query comes back empty, for testing what a page does with nothing.
 * Spread over it to make one thing non-empty.
 */
export function createEmptyApi(): ApiClient {
  return {
    delivers: false,
    events: { listUpcoming: async () => [], listPast: async () => [], getNext: async () => null, getBySlug: async () => null },
    festivals: { list: async () => [] },
    gallery: { listRecentMedia: async () => [], listAlbums: async () => [], getAlbum: async () => null },
    news: { listPosts: async () => [], getPost: async () => null, listAnnouncements: async () => [], listNewsletters: async () => [] },
    contact: { send: async () => { throw new Error('not connected') }, listMessages: async () => [] },
    portal: {
      getHousehold: async () => null,
      listHouseholds: async () => [],
      listDirectory: async () => [],
      listDocuments: async () => [],
      listRegistrationsForHousehold: async () => [],
      listRegistrationsForEvent: async () => [],
      listSignInAttempts: async () => [],
    },
    volunteering: { listOpenRoles: async () => [], listRolesForEvent: async () => [] },
  }
}

/** A client whose submissions are treated as reaching the committee, for form tests. */
export function createDeliveringTestApi(): ApiClient {
  return { ...createTestApi(), delivers: true }
}

type DataProps = { children: ReactNode; api?: ApiClient; session?: Session }

/** Query client, API and clock, without a router. Use with createMemoryRouter. */
export function TestDataProviders({ children, api = createTestApi(), session = { role: 'visitor' } }: DataProps) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <ApiProvider api={api}>
        <ClockProvider now={() => TEST_NOW}>
          <SessionProvider initial={session}>
            <ThemeProvider>{children}</ThemeProvider>
          </SessionProvider>
        </ClockProvider>
      </ApiProvider>
    </QueryClientProvider>
  )
}

type Props = DataProps & { route?: string }

/** Everything a component needs, including an in-memory router. */
export function TestProviders({ children, api, session, route = '/' }: Props) {
  return (
    <TestDataProviders api={api} session={session}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </TestDataProviders>
  )
}

type Options = Omit<RenderOptions, 'wrapper'> & { route?: string; api?: ApiClient; session?: Session }

export function renderWithProviders(ui: ReactElement, { route, api, session, ...options }: Options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders api={api} session={session} route={route}>
        {children}
      </TestProviders>
    ),
    ...options,
  })
}
