export const themeNames = ['festival', 'poila-boishakh', 'saraswati', 'holi', 'mahalaya'] as const

export type ThemeName = (typeof themeNames)[number]

export type ThemeMeta = {
  id: ThemeName
  name: string
  description: string
  /** Background and accent, for swatches in the picker. */
  swatch: [background: string, accent: string]
  /**
   * Optional photo or illustration shown faintly behind the hero, on top of the drawn motif.
   * Put the file in public/brand/themes/ and reference it here, e.g. '/brand/themes/saraswati.jpg'.
   */
  heroImage?: string
}

/** The community's year as colour schemes. Token values live in tokens.css. */
export const themes: ThemeMeta[] = [
  { id: 'festival', name: 'Festival', description: 'Sindoor red and marigold', swatch: ['#7a1a12', '#f7b733'] },
  { id: 'poila-boishakh', name: 'Poila Boishakh', description: 'Cream and red, like a lal-paar sari', swatch: ['#fff6ea', '#c8102e'] },
  { id: 'saraswati', name: 'Saraswati Puja', description: 'Basanti yellow with deep blue', swatch: ['#fff7d6', '#1f5fbf'] },
  { id: 'holi', name: 'Holi', description: 'Magenta and bright yellow', swatch: ['#8e1a6b', '#ffd60a'] },
  { id: 'mahalaya', name: 'Mahalaya', description: 'Pre-dawn indigo and shiuli orange', swatch: ['#1c1b4a', '#ff9a3c'] },
]

export const defaultTheme: ThemeName = 'festival'

export const THEME_STORAGE_KEY = '13parbon:theme'

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (themeNames as readonly string[]).includes(value)
}

/** Sets the active theme by stamping `data-theme` on the root element. */
export function applyTheme(name: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = name
}

/** The theme the viewer chose last time, if any. Storage may be unavailable; that is fine. */
export function readStoredTheme(storage: Pick<Storage, 'getItem'> | null = safeStorage()): ThemeName | null {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY)
    return isThemeName(value) ? value : null
  } catch {
    return null
  }
}

export function storeTheme(name: ThemeName, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, name)
  } catch {
    // Private mode or blocked storage. The choice just will not persist.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
