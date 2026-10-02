import { SITE_THEMES } from '@/domain/siteContent'

/**
 * The community's year, for the public site. These are the festival colours, and from
 * 2026-09-17 they are the public site's alone: the committee's own screens were following
 * them, which meant doing the books against a magenta Holi background.
 */
export const publicThemeNames = SITE_THEMES

/**
 * The portal's own. The first six are deliberately quiet; the last three are for whoever would
 * rather they were not, with the colour kept to the frame and the cards still plain.
 *
 * The quiet ones, first:
 *
 * Nobody chooses a festival palette to spend an hour in a spreadsheet. These are made to be
 * looked past rather than at: neutral grounds, one restrained accent, and enough contrast to
 * read a table of names in. The festival themes stay where they belong — on the public site,
 * and on an evening being designed.
 */
export const portalThemeNames = ['paper', 'linen', 'sage', 'mist', 'slate', 'midnight', 'marigold', 'lagoon', 'peacock'] as const

export const themeNames = [...publicThemeNames, ...portalThemeNames] as const

export type ThemeName = (typeof themeNames)[number]
export type PublicThemeName = (typeof publicThemeNames)[number]
export type PortalThemeName = (typeof portalThemeNames)[number]

/** Which set of looks a screen offers: the festivals, or the committee's own. */
export type ThemeScope = 'public' | 'portal'

export type ThemeMeta = {
  id: ThemeName
  name: string
  description: string
  /** Background and accent, for swatches in the picker. */
  swatch: [background: string, accent: string]
  /**
   * The colour of the portal's frame — its menu, header and footer — where it is the thing that
   * tells one portal theme from another. The picker rings the swatch in it, and a phone's own
   * bar takes it, so the strip above the page matches the header under it. Absent on the two
   * themes whose frame is the page's own colour, completely light and completely dark.
   */
  frame?: string
  /**
   * Optional photo or illustration shown faintly behind the hero, on top of the drawn motif.
   * Put the file in public/brand/themes/ and reference it here, e.g. '/brand/themes/saraswati.jpg'.
   */
  heroImage?: string
}

/** The community's year as colour schemes. Token values live in tokens.css. */
export const themes: ThemeMeta[] = [
  { id: 'festival', name: 'Festival', description: 'Sindoor red and marigold', swatch: ['#7a1a12', '#f7b733'] },
  { id: 'poila-boishakh', name: 'Boishakhi', description: 'Cream and red, like a lal-paar sari', swatch: ['#fff6ea', '#c8102e'] },
  { id: 'saraswati', name: 'Saraswati Puja', description: 'Basanti yellow with deep blue', swatch: ['#fff7d6', '#1f5fbf'] },
  { id: 'holi', name: 'Holi', description: 'Magenta and bright yellow', swatch: ['#8e1a6b', '#ffd60a'] },
  { id: 'mahalaya', name: 'Mahalaya', description: 'Pre-dawn indigo and shiuli orange', swatch: ['#1c1b4a', '#ff9a3c'] },
  { id: 'kojagori', name: 'Kojagori', description: 'Full-moon blue and pale gold, for Lakshmi Puja', swatch: ['#13294b', '#f2d58a'] },
  { id: 'deepavali', name: 'Deepavali', description: 'A dark night lit by diyas, for Kali Puja', swatch: ['#1b120c', '#ffb42e'] },
  { id: 'borodin', name: 'Borodin', description: 'Winter white, holly green and berry red', swatch: ['#f5f8f3', '#1d6b43'] },
]

/*
 * One completely light and one completely dark — Paper and Slate, the page and its frame alike —
 * and every other with its menu, header and footer in a colour of its own around the page.
 */
export const portalThemes: ThemeMeta[] = [
  { id: 'paper', name: 'Paper', description: 'Completely light: warm white throughout, with a deep blue', swatch: ['#f7f7f5', '#1f4e79'] },
  { id: 'linen', name: 'Linen', description: 'Soft oatmeal, with a deep wine-red menu', swatch: ['#f6f3ed', '#8c2f39'], frame: '#6b2230' },
  // Once Sage, and green. Kept under its old id so a choice already saved still finds it.
  { id: 'sage', name: 'Denim', description: 'Pale blue-grey, with a denim-blue menu', swatch: ['#f1f4f8', '#2f5d8a'], frame: '#1f3a5a' },
  { id: 'mist', name: 'Mist', description: 'Cool grey, with a dark indigo menu', swatch: ['#f3f4f8', '#4338ca'], frame: '#1a1b2e' },
  { id: 'slate', name: 'Slate', description: 'Completely dark: blue-grey throughout, for long evenings', swatch: ['#16181d', '#6aa9ff'] },
  { id: 'midnight', name: 'Midnight', description: 'Deep navy, with a teal menu', swatch: ['#0e1726', '#4ecdc4'], frame: '#115e59' },
  { id: 'marigold', name: 'Marigold', description: 'Colourful: cream, with an orange-into-pink menu', swatch: ['#fff6ea', '#ea580c'], frame: '#c2410c' },
  { id: 'lagoon', name: 'Lagoon', description: 'Colourful: pale teal, with a teal-into-blue menu', swatch: ['#ecfaf8', '#0e7490'], frame: '#0f766e' },
  { id: 'peacock', name: 'Peacock', description: 'Colourful: dark violet, with a violet-and-magenta menu and gold', swatch: ['#1a0f2e', '#db2777'], frame: '#6d28d9' },
]

export const defaultTheme: ThemeName = 'festival'
export const defaultPortalTheme: ThemeName = 'paper'

/** Separate keys, so choosing Slate for the back office does not repaint the public site. */
export const THEME_STORAGE_KEY = '13parbon:theme'
/**
 * The committee's choice of colours, as this browser last heard it.
 *
 * Kept so the second visit opens in the right colours straight away. Without it every page
 * load would start in Festival red and change a moment later, once the settings had arrived.
 */
export const SITE_THEME_STORAGE_KEY = '13parbon:site-theme'
export const PORTAL_THEME_STORAGE_KEY = '13parbon:portal-theme'

/**
 * Which set of looks an address belongs to: the committee's quiet ones under /portal and /admin,
 * the festivals everywhere else.
 *
 * Read from the address so that a reload in the portal starts in the portal's colours. The
 * portal's layout says so too, but only once it is on screen — after the sign-in has been
 * checked, which with Google is long enough to see — and until then a reload showed Festival
 * red. The script at the top of index.html makes the same test, before any of this has loaded.
 */
export function scopeForPath(pathname: string): ThemeScope {
  return /^\/(portal|admin)(\/|$)/.test(pathname) ? 'portal' : 'public'
}

export const themesFor = (scope: ThemeScope): ThemeMeta[] => (scope === 'portal' ? portalThemes : themes)
export const defaultFor = (scope: ThemeScope): ThemeName => (scope === 'portal' ? defaultPortalTheme : defaultTheme)
const keyFor = (scope: ThemeScope) => (scope === 'portal' ? PORTAL_THEME_STORAGE_KEY : THEME_STORAGE_KEY)

/** Whether this name belongs to that scope's set — a stale value from the other must not leak in. */
export function isThemeForScope(value: unknown, scope: ThemeScope): value is ThemeName {
  const names: readonly string[] = scope === 'portal' ? portalThemeNames : publicThemeNames
  return typeof value === 'string' && names.includes(value)
}

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (themeNames as readonly string[]).includes(value)
}

/** Sets the active theme by stamping `data-theme` on the root element. */
export function applyTheme(name: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = name
  // The browser's own colour — the strip above the page on a phone — to match, rather than
  // the Festival red written into index.html whatever the page underneath is wearing.
  // In the portal, the frame's colour: the header is what sits under the browser's bar there.
  const meta = [...themes, ...portalThemes].find((theme) => theme.id === name)
  const ground = meta?.frame ?? meta?.swatch[0]
  if (ground) root.ownerDocument.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground)
}

/** The theme the viewer chose last time, if any. Storage may be unavailable; that is fine. */
export function readStoredTheme(
  scope: ThemeScope = 'public',
  storage: Pick<Storage, 'getItem'> | null = safeStorage(),
): ThemeName | null {
  try {
    const value = storage?.getItem(keyFor(scope))
    return isThemeForScope(value, scope) ? value : null
  } catch {
    return null
  }
}

export function storeTheme(
  name: ThemeName,
  scope: ThemeScope = 'public',
  storage: Pick<Storage, 'setItem'> | null = safeStorage(),
): void {
  try {
    storage?.setItem(keyFor(scope), name)
  } catch {
    // Private mode or blocked storage. The choice just will not persist.
  }
}

/** The committee's choice as this browser last heard it, if it ever has. */
export function readSiteTheme(storage: Pick<Storage, 'getItem'> | null = safeStorage()): ThemeName | null {
  try {
    const value = storage?.getItem(SITE_THEME_STORAGE_KEY)
    return isThemeForScope(value, 'public') ? value : null
  } catch {
    return null
  }
}

export function storeSiteTheme(name: ThemeName, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(SITE_THEME_STORAGE_KEY, name)
  } catch {
    // Private mode or blocked storage. The next visit just starts from what the code says.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
