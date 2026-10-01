import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useSettings, useSettingsLoaded } from '../SettingsContext'
import {
  applyTheme,
  defaultFor,
  readSiteTheme,
  readStoredTheme,
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
  const [scope, setScope] = useState<ThemeScope>('public')
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
  const siteTheme: ThemeName = loaded ? settings.defaultTheme : (remembered ?? settings.defaultTheme)

  useEffect(() => {
    if (loaded) storeSiteTheme(settings.defaultTheme)
  }, [loaded, settings.defaultTheme])

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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, scope, setScope, options: themesFor(scope) }}>
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
