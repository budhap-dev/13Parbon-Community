// Read as text through Vite, so this needs no Node types and stays in step with the files
// that actually ship.
import html from '../../index.html?raw'
import sitemap from '../../public/sitemap.xml?raw'

function meta(attr: 'property' | 'name', key: string): string | undefined {
  return new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1]
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
    expect(meta('property', 'og:image')).toBe('https://13parbon.vercel.app/brand/share-card.jpg')
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

describe('the sitemap', () => {
  it('lists only pages that exist and are meant to be found', () => {
    // The listed URLs, not the whole file: the comment in it names the pages left out.
    const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      m[1].replace('https://13parbon.vercel.app', ''),
    )
    expect(listed).toEqual(['/', '/events', '/about', '/contact', '/privacy'])
    // /join was removed and the other two are parked: sending a crawler to any of them is a
    // dead end.
    for (const gone of ['/join', '/gallery', '/news']) {
      expect(listed).not.toContain(gone)
    }
  })
})
