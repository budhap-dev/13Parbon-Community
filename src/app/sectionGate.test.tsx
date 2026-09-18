import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { defaultSettings } from '@/app/defaults'
import { createMockApi, type ApiClient } from '@/lib/api'
import { TestDataProviders } from '@/test/render'
import type { SiteSettings } from '@/domain/settings'

/** The committee's switches, as the site would read them back. */
function withSwitches(over: Partial<SiteSettings>): ApiClient {
  const base = createMockApi()
  return { ...base, settings: { ...base.settings, get: async () => ({ ...defaultSettings, ...over }) } }
}

function renderAt(path: string, api: ApiClient) {
  render(
    <TestDataProviders api={api}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

/*
 * The switches changed the navigation and nothing else, which is less than the screen offering
 * them says. "Turning this off pulls the whole gallery at once" was untrue for anybody holding
 * an address: every album and every photograph answered exactly as before, and the only thing
 * that had gone was the link. Found by walking the site with the news switched off, 2026-09-17,
 * and finding a news page sitting there saying "Nothing here yet".
 */
describe('a section the committee has switched off', () => {
  it('shows the gallery while photographs are on', async () => {
    renderAt('/gallery', withSwitches({ showPhotos: true }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Gallery' })).toBeInTheDocument()
  })

  it('answers as though the gallery were not there once it is off', async () => {
    renderAt('/gallery', withSwitches({ showPhotos: false }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('takes the albums with it, not only the page that lists them', async () => {
    // The point of the switch: a photograph nobody can reach through the site, rather than one
    // whose link has been removed from a menu.
    renderAt('/gallery/boishakhi-2026', withSwitches({ showPhotos: false }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows the news page once there is news to carry', async () => {
    renderAt('/news', withSwitches({ showNews: true }))
    expect(await screen.findByRole('heading', { level: 1, name: /News/ })).toBeInTheDocument()
  })

  it('answers as though the news were not there while it is off', async () => {
    renderAt('/news', withSwitches({ showNews: false }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('takes the pieces with it', async () => {
    renderAt('/news/mahalaya-programme-what-to-expect', withSwitches({ showNews: false }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})
