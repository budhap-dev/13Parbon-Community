import {
  applyTheme,
  defaultTheme,
  isThemeName,
  readStoredTheme,
  storeTheme,
  THEME_STORAGE_KEY,
  themeNames,
  themes,
  defaultPortalTheme,
  portalThemes,
  portalThemeNames,
  publicThemeNames,
  themesFor,
} from './themes'

describe('themes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has metadata for every theme in both sets', () => {
    expect(defaultTheme).toBe('festival')
    expect(defaultPortalTheme).toBe('paper')
    // Two sets, and every name in each has a look to go with it.
    expect(themes.map((t) => t.id)).toEqual([...publicThemeNames])
    expect(portalThemes.map((t) => t.id)).toEqual([...portalThemeNames])
    expect([...themeNames]).toEqual([...publicThemeNames, ...portalThemeNames])
    for (const theme of [...themes, ...portalThemes]) {
      expect(theme.name).not.toBe('')
      expect(theme.swatch).toHaveLength(2)
    }
  })

  /*
   * The two must not leak into each other. A festival name left in the portal's key would put
   * the committee back on a magenta ground; a portal name in the public key would take the
   * festivals off the website, which is most of what the website looks like.
   */
  it('keeps each set to its own storage key', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    }

    storeTheme('slate', 'portal', storage)
    storeTheme('holi', 'public', storage)
    expect(readStoredTheme('portal', storage)).toBe('slate')
    expect(readStoredTheme('public', storage)).toBe('holi')

    // A value belonging to the other set is not honoured.
    store.set('13parbon:portal-theme', 'holi')
    expect(readStoredTheme('portal', storage)).toBeNull()
  })

  it('offers each scope only its own looks', () => {
    expect(themesFor('portal').map((t) => t.id)).toEqual(['paper', 'linen', 'slate'])
    expect(themesFor('public').map((t) => t.id)).toContain('festival')
    expect(themesFor('public').map((t) => t.id)).not.toContain('slate')
  })

  it('recognises known theme names only', () => {
    expect(isThemeName('holi')).toBe(true)
    expect(isThemeName('neon')).toBe(false)
    expect(isThemeName(42)).toBe(false)
  })

  it('stamps data-theme on the given root', () => {
    const root = document.createElement('div')
    applyTheme('mahalaya', root)
    expect(root.dataset.theme).toBe('mahalaya')
  })

  it('defaults to the document root', () => {
    applyTheme('festival')
    expect(document.documentElement.dataset.theme).toBe('festival')
  })

  it('reads and writes the stored theme', () => {
    expect(readStoredTheme()).toBeNull()
    storeTheme('saraswati')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('saraswati')
    expect(readStoredTheme()).toBe('saraswati')
  })

  it('ignores garbage in storage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'disco')
    expect(readStoredTheme()).toBeNull()
  })

  it('survives storage that throws or is missing', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readStoredTheme('public', broken)).toBeNull()
    expect(() => storeTheme('holi', 'public', broken)).not.toThrow()
    expect(readStoredTheme('public', null)).toBeNull()
    expect(() => storeTheme('holi', 'public', null)).not.toThrow()
  })
})
