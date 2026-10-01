import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { defaultSettings } from '@/app/defaults'
import type { SiteSettings } from '@/domain/settings'
import { useApi } from '@/lib/api'

const SettingsContext = createContext<SiteSettings>(defaultSettings)
/** Whether what the context holds was read from the committee's saved settings yet. */
const SettingsLoadedContext = createContext(false)

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
  return (
    <SettingsLoadedContext.Provider value={data !== undefined}>
      <SettingsContext.Provider value={data ?? defaultSettings}>{children}</SettingsContext.Provider>
    </SettingsLoadedContext.Provider>
  )
}

/**
 * Whether the settings have arrived, as opposed to still being what the code says.
 *
 * Almost nothing should ask. A page draws the same either way, and that is the point of the
 * fallback. The one thing that has to know is anything that *remembers* a setting between
 * visits: "the committee chose Festival" and "nothing has loaded yet" hold the same value, and
 * only one of them is worth writing down.
 */
export function useSettingsLoaded(): boolean {
  return useContext(SettingsLoadedContext)
}

export function useSettings(): SiteSettings {
  return useContext(SettingsContext)
}
