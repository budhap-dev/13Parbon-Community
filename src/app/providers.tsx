import { QueryClientProvider, QueryClient, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ApiProvider, createApi, type ApiClient } from '@/lib/api'
import { ClockProvider, type Clock } from '@/lib/clock'
import { GoogleSignInProvider } from '@/lib/auth/GoogleSignIn'
import { SessionProvider, useSession, type Session } from '@/lib/auth/session'
import { SettingsProvider } from './SettingsContext'
import { ThemeProvider } from './theme/ThemeContext'
import { defaultTheme, type ThemeName } from './theme/themes'

type Props = {
  api: ApiClient
  /**
   * What a preview runs on. Defaults to fixtures, which is the whole point of one.
   *
   * Overridable so a test can hand in a client it can watch.
   */
  previewApi?: ApiClient
  /** Theme used until the viewer picks one. */
  theme?: ThemeName
  now?: Clock
  /** Who is signed in. Defaults to whatever the browser remembers, else a visitor. */
  session?: Session
  children: ReactNode
}

/**
 * Fixtures while a preview is open, the real client otherwise.
 *
 * A sample household is a household the database does not have. On a build with no project
 * configured that did not matter, because everything was fixtures anyway — but against the real
 * one, walking through as `hh-sen` asks Postgres for a row whose id is not even a uuid. The
 * preview has to bring its own data or it is not a preview, it is an error page.
 *
 * Switching also empties the query cache, because TanStack keys on the query, not on which
 * client answered it: without this, the first screen of a preview shows whatever the real
 * database had already cached under the same key.
 */
export function ApiForSession({ real, fixtures, children }: { real: ApiClient; fixtures: ApiClient; children: ReactNode }) {
  const { session } = useSession()
  const inPreview = session.role !== 'visitor' && session.preview === true
  const client = useQueryClient()
  const previous = useRef(inPreview)

  useEffect(() => {
    if (previous.current === inPreview) return
    previous.current = inPreview
    client.clear()
  }, [inPreview, client])

  return <ApiProvider api={inPreview ? fixtures : real}>{children}</ApiProvider>
}

export function AppProviders({ api, previewApi, theme = defaultTheme, now = () => new Date(), session, children }: Props) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } }),
  )
  // `createApi({})` with no environment is the fixture client, audit wrapper and all.
  const [fixtures] = useState(() => previewApi ?? createApi({}))

  return (
    <QueryClientProvider client={client}>
      <ClockProvider now={now}>
        <SessionProvider initial={session}>
          <ApiForSession real={api} fixtures={fixtures}>
            <GoogleSignInProvider>
              <SettingsProvider>
                <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
              </SettingsProvider>
            </GoogleSignInProvider>
          </ApiForSession>
        </SessionProvider>
      </ClockProvider>
    </QueryClientProvider>
  )
}
