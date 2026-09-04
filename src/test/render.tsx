import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { ApiProvider, createMockApi, type ApiClient } from '@/lib/api'
import { testEvents } from './events'
import { ClockProvider } from '@/lib/clock'
import { ThemeProvider } from '@/app/theme/ThemeContext'
import { GoogleSignInProvider } from '@/lib/auth/GoogleSignIn'
import { SessionProvider, type Session } from '@/lib/auth/session'

/** Fixed clock for tests so relative fixture dates and countdowns are stable. */
export const TEST_NOW = new Date('2026-09-03T10:00:00')

export function createTestApi(): ApiClient {
  return createMockApi({ now: () => TEST_NOW, events: testEvents })
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

/**
 * A client where every read throws, for testing what a page does when the data does not
 * arrive. Spread over it to let one thing through.
 */
export function createFailingApi(): ApiClient {
  const down = async (): Promise<never> => {
    throw new Error('the network is down')
  }
  return {
    delivers: false,
    events: { listUpcoming: down, listPast: down, getNext: down, getBySlug: down },
    festivals: { list: down },
    gallery: { listRecentMedia: down, listAlbums: down, getAlbum: down },
    news: { listPosts: down, getPost: down, listAnnouncements: down, listNewsletters: down },
    contact: { send: down, listMessages: down },
    portal: {
      getHousehold: down,
      listHouseholds: down,
      listDirectory: down,
      listDocuments: down,
      listRegistrationsForHousehold: down,
      listRegistrationsForEvent: down,
      listSignInAttempts: down,
    },
    volunteering: { listOpenRoles: down, listRolesForEvent: down },
  }
}

/** A client whose submissions are treated as reaching the committee, for form tests. */
export function createDeliveringTestApi(): ApiClient {
  return { ...createTestApi(), delivers: true }
}

type DataProps = {
  children: ReactNode
  api?: ApiClient
  session?: Session
  /** Sign-in settings. Empty by default, so no test reaches for a real Supabase project. */
  env?: Record<string, string | undefined>
}

/** Query client, API and clock, without a router. Use with createMemoryRouter. */
export function TestDataProviders({
  children,
  api = createTestApi(),
  session = { role: 'visitor' },
  env = {},
}: DataProps) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <ApiProvider api={api}>
        <ClockProvider now={() => TEST_NOW}>
          <SessionProvider initial={session}>
            <GoogleSignInProvider env={env}>
              <ThemeProvider>{children}</ThemeProvider>
            </GoogleSignInProvider>
          </SessionProvider>
        </ClockProvider>
      </ApiProvider>
    </QueryClientProvider>
  )
}

type Props = DataProps & { route?: string }

/** Everything a component needs, including an in-memory router. */
export function TestProviders({ children, api, session, env, route = '/' }: Props) {
  return (
    <TestDataProviders api={api} session={session} env={env}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </TestDataProviders>
  )
}

type Options = Omit<RenderOptions, 'wrapper'> & {
  route?: string
  api?: ApiClient
  session?: Session
  env?: Record<string, string | undefined>
}

export function renderWithProviders(ui: ReactElement, { route, api, session, env, ...options }: Options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders api={api} session={session} env={env} route={route}>
        {children}
      </TestProviders>
    ),
    ...options,
  })
}
