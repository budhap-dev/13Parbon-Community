import {
  applyTheme,
  defaultTheme,
  isThemeName,
  readStoredTheme,
  storeTheme,
  THEME_STORAGE_KEY,
  themeNames,
  themes,
} from './themes'

describe('themes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has festival as the default theme and metadata for every theme', () => {
    expect(defaultTheme).toBe('festival')
    expect(themes.map((t) => t.id)).toEqual([...themeNames])
    for (const theme of themes) {
      expect(theme.name).not.toBe('')
      expect(theme.swatch).toHaveLength(2)
    }
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
    expect(readStoredTheme(broken)).toBeNull()
    expect(() => storeTheme('holi', broken)).not.toThrow()
    expect(readStoredTheme(null)).toBeNull()
    expect(() => storeTheme('holi', null)).not.toThrow()
  })
})
