// Read as text through Vite, so this needs no Node types and stays in step with the files
// that actually ship.
import html from '../../index.html?raw'
import sitemap from '../../public/sitemap.xml?raw'
import robots from '../../public/robots.txt?raw'
import { publicNav } from './nav'

/**
 * The one address the site calls its own. Everything a crawler is handed has to agree with
 * it: the moment two of these disagree, search engines are told the site lives in two places
 * and the sharing cards point somewhere the site no longer is.
 */
const origin = 'https://13parbon.org.uk'
/** The same address, safe to drop into a regular expression. */
const escaped = origin.replace(/[.]/g, '\\.')

function meta(attr: 'property' | 'name', key: string): string | undefined {
  return new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1]
}

function link(rel: string): string | undefined {
  return new RegExp(`<link rel="${rel}" href="([^"]*)"`).exec(html)?.[1]
}

/**
 * These live in the served HTML rather than in the app, because the crawlers that read them
 * do not run JavaScript. That also means nothing in the React tree can be relied on to keep
 * them right, so they are checked here.
 */
describe('the card shown when a link is shared', () => {
  it('gives a crawler a title, a description and a picture', () => {
    expect(meta('property', 'og:title')).toBe('13Parbon Community')
    expect(meta('property', 'og:description')).toMatch(/Bengali cultural association in Leeds/)
    expect(meta('property', 'og:image')).toBe(`${origin}/brand/share-card.jpg`)
  })

  it('points at the picture absolutely, since it is fetched from outside the site', () => {
    for (const key of ['og:image', 'og:url'] as const) {
      expect(meta('property', key)).toMatch(/^https:\/\//)
    }
    expect(meta('name', 'twitter:image')).toMatch(/^https:\/\//)
  })

  it('declares the size, which is what earns the wide card rather than a thumbnail', () => {
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
  })
})

/**
 * The site answers on more than one address — www redirects to the bare domain, and the old
 * vercel.app address does too. The canonical link is what settles which of them search
 * engines should keep, so it is the one tag that must never be left behind by a move.
 */
describe('the address the site claims as its own', () => {
  it('names the canonical domain', () => {
    expect(link('canonical')).toBe(`${origin}/`)
  })

  it('is the same address everywhere a crawler is pointed', () => {
    const absolute = [
      link('canonical'),
      meta('property', 'og:url'),
      meta('property', 'og:image'),
      meta('name', 'twitter:image'),
      ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
      /^Sitemap:\s*(\S+)/m.exec(robots)?.[1],
    ]

    // Nothing above may be missing: an undefined here means a tag was renamed or dropped and
    // the check below would pass over it in silence.
    expect(absolute).not.toContain(undefined)
    for (const url of absolute) {
      expect(url?.startsWith(`${origin}/`)).toBe(true)
    }
  })

  it('tells crawlers where the sitemap is, and lets them in', () => {
    expect(robots).toMatch(/^User-agent:\s*\*/m)
    expect(robots).toMatch(/^Allow:\s*\//m)
    expect(robots).toMatch(new RegExp(`^Sitemap:\\s*${escaped}/sitemap\\.xml$`, 'm'))
  })
})

/**
 * The sitemap went stale once already: the gallery came back into the navigation and nothing
 * noticed, because the test named the five pages it expected instead of asking what the site
 * actually offers. This asks.
 */
describe('the navigation and what crawlers are told', () => {
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(origin, '') || '/')
  const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1])
  const blocked = (path: string) => disallowed.some((rule) => path === rule || path.startsWith(`${rule}/`))

  it('accounts for every page in the navigation, by listing it or by keeping it out on purpose', () => {
    for (const item of publicNav) {
      const accounted = listed.includes(item.to) || blocked(item.to)
      expect(accounted, `${item.to} is in the navigation but neither in the sitemap nor disallowed in robots.txt`).toBe(true)
    }
  })

  it('keeps the gallery out of search while leaving the rest in', () => {
    // The committee's decision: open to anyone with the link, not in an image search.
    expect(blocked('/gallery')).toBe(true)
    expect(listed).not.toContain('/gallery')
    expect(blocked('/')).toBe(false)
    expect(blocked('/events')).toBe(false)
  })
})

describe('the sitemap', () => {
  it('lists only pages that exist and are meant to be found', () => {
    // The listed URLs, not the whole file: the comment in it names the pages left out.
    const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(origin, ''))
    expect(listed).toEqual(['/', '/events', '/about', '/contact', '/privacy'])
    // /join was removed and the other two are parked: sending a crawler to any of them is a
    // dead end.
    for (const gone of ['/join', '/gallery', '/news']) {
      expect(listed).not.toContain(gone)
    }
  })
})
