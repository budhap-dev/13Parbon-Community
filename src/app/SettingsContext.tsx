import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { defaultSettings } from '@/app/site'
import type { SiteSettings } from '@/domain/settings'
import { useApi } from '@/lib/api'

const SettingsContext = createContext<SiteSettings>(defaultSettings)

/**
 * The committee's switches, available to the whole app.
 *
 * Falls back to what `site.ts` says while they are loading and if they cannot be read at all.
 * That is the cautious way round: a site whose database is unreachable should carry on showing
 * what the code says rather than briefly publishing the things the committee switched off.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    // They change rarely and are read by nearly every page, so asking once is plenty.
    staleTime: 5 * 60 * 1000,
  })
  return <SettingsContext.Provider value={data ?? defaultSettings}>{children}</SettingsContext.Provider>
}

export function useSettings(): SiteSettings {
  return useContext(SettingsContext)
}
