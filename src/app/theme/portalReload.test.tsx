import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeContext'
import { PORTAL_THEME_STORAGE_KEY, applyTheme, portalThemeNames, scopeForPath } from './themes'
import html from '../../../index.html?raw'

/**
 * A reload in the portal starts in the portal's colours.
 *
 * It used to start in Festival red and change a moment later: the script in index.html only
 * knew the public site's themes, and the app learned it was in the portal only once the portal's
 * layout was on screen — after the sign-in check, which with Google takes long enough to see.
 */

const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''

/** Runs the script in index.html against an address and whatever is in storage. */
function firstPaint(pathname: string, stored: Record<string, string> = {}, blocked = false): string | undefined {
  const root = { dataset: {} as Record<string, string> }
  const storage = {
    getItem: (key: string) => {
      if (blocked) throw new Error('SecurityError')
      return stored[key] ?? null
    },
  }
  new Function('location', 'localStorage', 'document', script)({ pathname }, storage, { documentElement: root })
  return root.dataset.theme
}

describe('the first paint, before the app has loaded', () => {
  it('is the portal’s default in the portal, not the festivals', () => {
    expect(firstPaint('/admin/people')).toBe('paper')
    expect(firstPaint('/portal')).toBe('paper')
  })

  it('is the committee member’s own portal choice when there is one', () => {
    expect(firstPaint('/admin', { [PORTAL_THEME_STORAGE_KEY]: 'slate' })).toBe('slate')
  })

  it('ignores a festival left in the portal’s key', () => {
    expect(firstPaint('/admin', { [PORTAL_THEME_STORAGE_KEY]: 'holi' })).toBe('paper')
  })

  it('is still the portal’s when storage is blocked', () => {
    expect(firstPaint('/admin', {}, true)).toBe('paper')
  })

  it('leaves the public site as it was', () => {
    expect(firstPaint('/events', { '13parbon:theme': 'holi', [PORTAL_THEME_STORAGE_KEY]: 'slate' })).toBe('holi')
    expect(firstPaint('/')).toBeUndefined()
    // Only the portal's own addresses: a page whose name merely begins with the word is public.
    expect(firstPaint('/administration')).toBeUndefined()
  })

  it('knows the same portal themes as the app does', () => {
    const listed = /var portalThemes = \[([^\]]*)\]/.exec(script)?.[1].match(/'([a-z-]+)'/g)?.map((name) => name.slice(1, -1))
    expect(listed).toEqual([...portalThemeNames])
  })
})

describe('which set of looks an address belongs to', () => {
  it('is the portal’s under /portal and /admin, and the festivals everywhere else', () => {
    expect(scopeForPath('/portal')).toBe('portal')
    expect(scopeForPath('/portal/play/q1')).toBe('portal')
    expect(scopeForPath('/admin/content')).toBe('portal')
    expect(scopeForPath('/')).toBe('public')
    expect(scopeForPath('/login')).toBe('public')
    expect(scopeForPath('/portals')).toBe('public')
  })
})

describe('the app taking over', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => window.history.pushState({}, '', '/'))

  it('starts in the portal’s colours on a portal address, before any layout has said so', () => {
    window.history.pushState({}, '', '/admin/people')
    render(
      <ThemeProvider initialTheme="festival">
        <p>Checking your sign-in…</p>
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.theme).toBe('paper')
  })

  it('starts in the festivals elsewhere', () => {
    window.history.pushState({}, '', '/events')
    render(
      <ThemeProvider initialTheme="festival">
        <p>Events</p>
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.theme).toBe('festival')
  })

  it('colours the browser’s own bar to match the page', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#7a1a12'
    document.head.append(meta)
    applyTheme('slate')
    expect(meta.content).toBe('#16181d')
    applyTheme('festival')
    expect(meta.content).toBe('#7a1a12')
    meta.remove()
  })
})
