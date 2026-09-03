import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ApiProvider, type ApiClient } from '@/lib/api'
import { ClockProvider, type Clock } from '@/lib/clock'
import { ThemeProvider } from './theme/ThemeContext'
import { defaultTheme, type ThemeName } from './theme/themes'

type Props = {
  api: ApiClient
  /** Theme used until the viewer picks one. */
  theme?: ThemeName
  now?: Clock
  children: ReactNode
}

export function AppProviders({ api, theme = defaultTheme, now = () => new Date(), children }: Props) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } }),
  )

  return (
    <QueryClientProvider client={client}>
      <ApiProvider api={api}>
        <ClockProvider now={now}>
          <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
        </ClockProvider>
      </ApiProvider>
    </QueryClientProvider>
  )
}
