import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { civilDate } from '@/domain/bengaliDate'
import { useNow } from '@/lib/clock'
import { useSettings, useSettingsLoaded } from '../SettingsContext'
import { seasonFor, type Season } from './seasons'
import {
  applyTheme,
  defaultFor,
  forgetTheme,
  readSiteSeason,
  readSiteTheme,
  readStoredTheme,
  scopeForPath,
  storeSiteSeason,
  storeSiteTheme,
  storeTheme,
  themesFor,
  type ThemeMeta,
  type ThemeName,
  type ThemeScope,
} from './themes'

type ThemeContextValue = {
  theme: ThemeName
  setTheme: (name: ThemeName) => void
  /** Which set this screen offers — the festivals, or the committee's own. */
  scope: ThemeScope
  /** The looks on offer here, for the switcher to draw. */
  options: ThemeMeta[]
  setScope: (scope: ThemeScope) => void
  /** On the public site: true while the viewer has not picked a theme, so the season's shows. */
  following: boolean
  /** Forgets the viewer's pick, so the committee's colours — and the festivals' — come back. */
  follow: () => void
  /** The festival whose colours the site is in today, if the committee's switch allows it. */
  season: Season | null
  /** Whether the committee lets the festivals' colours in at all. */
  seasonal: boolean
  /** What following the calendar wears today: the season's theme, or the committee's. */
  siteTheme: ThemeName
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

type Props = {
  /** Used when the viewer has not chosen a theme yet, ahead of the committee's own choice. */
  initialTheme?: ThemeName
  children: ReactNode
}

/**
 * Two choices, kept apart.
 *
 * The public site wears the community's festivals. The portal has its own quiet set, because
 * the committee were doing the books against a Holi magenta — the portal followed the public
 * themes, and a back office is not a celebration. Each scope remembers its own choice under its
 * own key, so picking Slate for the portal leaves the website exactly as the visitors see it.
 *
 * The public site has a third voice: the committee's. Somebody who has never chosen sees the
 * colours the committee set for the season, and somebody who has chosen keeps their own — a
 * visitor's `null` below means "has not chosen", which is what lets the committee's choice
 * through without ever overwriting a person's.
 */
export function ThemeProvider({ initialTheme, children }: Props) {
  // From the address to begin with, so the first paint of a reload in the portal is the
  // portal's. The layouts keep it right from then on.
  const [scope, setScope] = useState<ThemeScope>(() =>
    typeof window === 'undefined' ? 'public' : scopeForPath(window.location.pathname),
  )
  const [chosen, setChosen] = useState<{ public: ThemeName | null; portal: ThemeName }>(() => ({
    public: readStoredTheme('public') ?? initialTheme ?? null,
    portal: readStoredTheme('portal') ?? defaultFor('portal'),
  }))

  const settings = useSettings()
  const loaded = useSettingsLoaded()
  /*
   * What the committee chose, as far as this browser knows.
   *
   * The settings arrive a moment after the first paint, and until they do the context holds
   * what the code says. Painting that and then repainting is a flash of the wrong colours on
   * every visit, so the last answer is remembered and used until the real one lands.
   */
  const [remembered] = useState(() => readSiteTheme())
  const [rememberedSeason] = useState(() => readSiteSeason())
  /*
   * And the calendar's: a festival's own colours from five days before it to five days after,
   * ahead of the committee's choice, where the committee has left the switch on.
   */
  const today = civilDate(useNow())
  const inSeason = useMemo(() => seasonFor(today), [today])
  const season = settings.seasonalThemes ? inSeason : null
  const committee: ThemeName = season?.theme ?? settings.defaultTheme
  /*
   * Until the settings land, the committee's colours as last heard, with today's festival worked
   * out here rather than remembered — what was worn last time may be a festival that is over.
   */
  const beforeSettings: ThemeName = rememberedSeason.base
    ? rememberedSeason.seasonal === false
      ? rememberedSeason.base
      : (inSeason?.theme ?? rememberedSeason.base)
    : (remembered ?? committee)
  const siteTheme: ThemeName = loaded ? committee : beforeSettings

  // What was worn, for index.html to open the next visit in, and what it will be once it is over.
  useEffect(() => {
    if (!loaded) return
    storeSiteTheme(committee)
    storeSiteSeason({ base: settings.defaultTheme, seasonal: settings.seasonalThemes, until: season?.end ?? null })
  }, [loaded, committee, settings.defaultTheme, settings.seasonalThemes, season?.end])

  const theme = scope === 'portal' ? chosen.portal : (chosen.public ?? siteTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback(
    (name: ThemeName) => {
      setChosen((now) => ({ ...now, [scope]: name }))
      storeTheme(name, scope)
    },
    [scope],
  )

  const follow = useCallback(() => {
    setChosen((now) => ({ ...now, public: null }))
    forgetTheme('public')
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, scope, setScope, options: themesFor(scope), following: chosen.public === null, follow, season, seasonal: settings.seasonalThemes, siteTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}

/**
 * Declares which set of looks the screens below belong to, for as long as they are on screen.
 *
 * The portal calls this; leaving it puts the public site back into its festival colours without
 * the viewer having to choose anything.
 */
export function useThemeScope(scope: ThemeScope): void {
  const { setScope } = useTheme()
  useEffect(() => {
    setScope(scope)
    return () => setScope('public')
  }, [scope, setScope])
}
