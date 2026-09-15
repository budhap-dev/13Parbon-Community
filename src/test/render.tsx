import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { ApiProvider, createMockApi, withAuditTrail, type ApiClient } from '@/lib/api'
import { testEvents } from './events'
import { defaultSettings } from '@/app/site'
import { ClockProvider } from '@/lib/clock'
import { SettingsProvider } from '@/app/SettingsContext'
import { ThemeProvider } from '@/app/theme/ThemeContext'
import { GoogleSignInProvider } from '@/lib/auth/GoogleSignIn'
import { SessionProvider, type Session } from '@/lib/auth/session'

/** Fixed clock for tests so relative fixture dates and countdowns are stable. */
export const TEST_NOW = new Date('2026-09-03T10:00:00')

export function createTestApi(): ApiClient {
  // Wrapped exactly as createApi wraps it, so a test exercises the client the app runs on
  // rather than a plainer one that happens to pass.
  return withAuditTrail(createMockApi({ now: () => TEST_NOW, events: testEvents }), () => TEST_NOW)
}

/**
 * A client where every query comes back empty, for testing what a page does with nothing.
 * Spread over it to make one thing non-empty.
 */
export function createEmptyApi(): ApiClient {
  return {
    delivers: false,
    events: {
      listUpcoming: async () => [], listPast: async () => [], getNext: async () => null, getBySlug: async () => null,
      listAll: async () => [], save: async () => { throw new Error('not connected') },
      create: async () => { throw new Error('not connected') }, archive: async () => { throw new Error('not connected') },
    },
    festivals: { list: async () => [] },
    gallery: {
      listRecentMedia: async () => [], listAlbums: async () => [], getAlbum: async () => null,
      listAllAlbums: async () => [],
      createAlbum: async () => { throw new Error('not connected') },
      updateAlbum: async () => { throw new Error('not connected') },
      setCover: async () => { throw new Error('not connected') },
      setCaption: async () => { throw new Error('not connected') },
      reorder: async () => { throw new Error('not connected') },
      deleteMedia: async () => { throw new Error('not connected') },
    },
    news: {
      listPosts: async () => [], getPost: async () => null, listAnnouncements: async () => [], listNewsletters: async () => [],
      listAllPosts: async () => [], listAllAnnouncements: async () => [],
      createPost: async () => { throw new Error('not connected') },
      updatePost: async () => { throw new Error('not connected') },
      createAnnouncement: async () => { throw new Error('not connected') },
      updateAnnouncement: async () => { throw new Error('not connected') },
      removeAnnouncement: async () => { throw new Error('not connected') },
    },
    contact: { send: async () => { throw new Error('not connected') }, listMessages: async () => [], markHandled: async () => { throw new Error('not connected') } },
    portal: {
      identify: async () => null,
      getHousehold: async () => null,
      listHouseholds: async () => [],
      listDirectory: async () => [],
      listDocuments: async () => [],
      listSignInAttempts: async () => [],
      listAttendance: async () => [],
      recordAttendance: async () => { throw new Error('not connected') },
      addHousehold: async () => { throw new Error('not connected') },
      updateHousehold: async () => { throw new Error('not connected') },
      exportHousehold: async () => { throw new Error('not connected') },
      deleteHousehold: async () => { throw new Error('not connected') },
      resolveSignInAttempt: async () => { throw new Error('not connected') },
    },
    settings: { get: async () => defaultSettings, save: async () => { throw new Error('not connected') } },
    audit: { list: async () => [] },
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
    events: { listUpcoming: down, listPast: down, getNext: down, getBySlug: down, listAll: down, save: down, create: down, archive: down },
    festivals: { list: down },
    gallery: {
      listRecentMedia: down, listAlbums: down, getAlbum: down, listAllAlbums: down,
      createAlbum: down, updateAlbum: down, setCover: down, setCaption: down, reorder: down, deleteMedia: down,
    },
    news: {
      listPosts: down, getPost: down, listAnnouncements: down, listNewsletters: down,
      listAllPosts: down, listAllAnnouncements: down, createPost: down, updatePost: down,
      createAnnouncement: down, updateAnnouncement: down, removeAnnouncement: down,
    },
    contact: { send: down, listMessages: down, markHandled: down },
    portal: {
      identify: down,
      getHousehold: down,
      listHouseholds: down,
      listDirectory: down,
      listDocuments: down,
      listSignInAttempts: down,
      listAttendance: down,
      recordAttendance: down,
      addHousehold: down,
      updateHousehold: down,
      exportHousehold: down,
      deleteHousehold: down,
      resolveSignInAttempt: down,
    },
    settings: { get: down, save: down },
    audit: { list: down },
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
              <SettingsProvider>
                <ThemeProvider>{children}</ThemeProvider>
              </SettingsProvider>
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
