import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { defaultSettings } from '@/app/defaults'
import type { SiteSettings } from '@/domain/settings'
import { useApi } from '@/lib/api'

const SettingsContext = createContext<SiteSettings>(defaultSettings)
/** Whether what the context holds was read from the committee's saved settings yet. */
const SettingsLoadedContext = createContext(false)
/** Whether the read failed outright, and a way to ask again. */
const SettingsFailedContext = createContext<{ failed: boolean; retry: () => void }>({ failed: false, retry: () => {} })

/**
 * The committee's switches, available to the whole app.
 *
 * Falls back to what `site.ts` says while they are loading and if they cannot be read at all.
 * That is the cautious way round: a site whose database is unreachable should carry on showing
 * what the code says rather than briefly publishing the things the committee switched off.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const { data, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    // They change rarely and are read by nearly every page, so asking once is plenty.
    staleTime: 5 * 60 * 1000,
  })
  // Failed only while there is nothing saved in hand; a background refresh that fails after a
  // good read leaves the committee's own settings in place, which is still the right answer.
  const failed = isError && data === undefined
  const retry = useCallback(() => void refetch(), [refetch])
  const status = useMemo(() => ({ failed, retry }), [failed, retry])
  return (
    <SettingsFailedContext.Provider value={status}>
      <SettingsLoadedContext.Provider value={data !== undefined}>
        <SettingsContext.Provider value={data ?? defaultSettings}>{children}</SettingsContext.Provider>
      </SettingsLoadedContext.Provider>
    </SettingsFailedContext.Provider>
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

/**
 * Whether the saved settings could not be read at all, and a way to ask again. For the one
 * screen that edits them: it must not open its form on the fallback, and should say why.
 */
export function useSettingsFailed(): { failed: boolean; retry: () => void } {
  return useContext(SettingsFailedContext)
}

export function useSettings(): SiteSettings {
  return useContext(SettingsContext)
}
