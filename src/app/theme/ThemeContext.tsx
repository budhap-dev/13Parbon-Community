import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyTheme, defaultTheme, readStoredTheme, storeTheme, type ThemeName } from './themes'

type ThemeContextValue = {
  theme: ThemeName
  setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

type Props = {
  /** Used when the viewer has not chosen a theme yet. */
  initialTheme?: ThemeName
  children: ReactNode
}

export function ThemeProvider({ initialTheme = defaultTheme, children }: Props) {
  const [theme, setThemeState] = useState<ThemeName>(() => readStoredTheme() ?? initialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name)
    storeTheme(name)
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}
