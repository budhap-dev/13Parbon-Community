import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import { routes } from '@/app/router'
import { mergeSettings, type SiteSettings } from '@/domain/settings'
import { blankSponsor, type Sponsor } from '@/domain/sponsors'
import { createMockApi, type ApiClient } from '@/lib/api'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { expectNoAxeViolations } from '@/test/axe'
import { renderWithProviders, TestDataProviders } from '@/test/render'
import { SponsorsStrip } from '@/features/home/sections/SponsorsStrip'
import { SponsoredBy } from './SponsoredBy'

const sponsor = (over: Partial<Sponsor>): Sponsor => ({ ...blankSponsor(), ...over })

const LIST: Sponsor[] = [
  sponsor({
    id: 'raj-sweets',
    name: 'Raj Sweets',
    level: 'gold',
    logo: 'https://photos.13parbon.org.uk/full/sponsor-raj.jpg',
    href: 'https://rajsweets.example',
    blurb: 'Bengali sweets, made locally.',
    festivalIds: ['mahalaya'],
  }),
  sponsor({ id: 'bose-family', name: 'the Bose family', level: 'friend', person: true, agreed: true, festivalIds: ['mahalaya'] }),
  sponsor({ id: 'not-yet', name: 'The Sen family', person: true, agreed: false, festivalIds: ['mahalaya'] }),
  sponsor({ id: 'hidden', name: 'Last Year Ltd', shown: false, festivalIds: ['mahalaya'] }),
]

function withSponsors(over: Partial<SiteSettings> = {}): ApiClient {
  const base = createMockApi()
  const settings = { ...defaultSettings, showSponsors: true, sponsors: LIST, ...over }
  return { ...base, settings: { ...base.settings, get: async () => settings } }
}

function renderAt(path: string, api?: ApiClient, session = previewAccounts[1]) {
  return render(
    <TestDataProviders session={session} api={api}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

describe('the switch', () => {
  it('starts off, so nobody is thanked before the list is right', () => {
    expect(defaultSettings.showSponsors).toBe(false)
    expect(defaultSettings.sponsors).toEqual([])
  })

  it('answers the sponsors page as not found while it is off', async () => {
    renderAt('/sponsors', withSponsors({ showSponsors: false }), undefined)
    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveTextContent('Our sponsors')
    expect(screen.queryByRole('link', { name: 'Sponsors' })).not.toBeInTheDocument()
  })

  it('puts Sponsors in the navigation once it is on', async () => {
    renderAt('/', withSponsors(), undefined)
    expect((await screen.findAllByRole('link', { name: 'Sponsors' }))[0]).toHaveAttribute('href', '/sponsors')
  })
})

describe('the sponsors page', () => {
  it('thanks each sponsor on show, by level, and links out as a sponsored link', async () => {
    renderAt('/sponsors', withSponsors(), undefined)
    expect(await screen.findByRole('heading', { level: 1, name: 'Our sponsors' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Gold sponsors' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Friends' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Raj Sweets' })).toBeInTheDocument()
    expect(screen.getAllByText('Helps put on Mahalaya programme')).toHaveLength(2)

        const visit = screen.getByRole('link', { name: /Visit their website – Raj Sweets, opens in a new tab/ })
    expect(visit).toHaveAttribute('href', 'https://rajsweets.example')
    expect(visit).toHaveAttribute('rel', 'sponsored noopener')
    expect(visit).toHaveAttribute('target', '_blank')
  })

  it('names nobody who is hidden, or a family that has not yet said yes', async () => {
    renderAt('/sponsors', withSponsors(), undefined)
    await screen.findByRole('heading', { level: 1, name: 'Our sponsors' })
    expect(screen.queryByText('Last Year Ltd')).not.toBeInTheDocument()
    expect(screen.queryByText('The Sen family')).not.toBeInTheDocument()
  })

  it('says so when there is nobody to thank yet, and still invites', async () => {
    renderAt('/sponsors', withSponsors({ sponsors: [] }), undefined)
    expect(await screen.findByText('We have nobody to thank here just yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Talk to the committee.' })).toHaveAttribute('href', '/contact')
  })

  it('draws no tile for a sponsor with no logo, since the name is printed beside it', async () => {
    renderAt('/sponsors', withSponsors(), undefined)
    await screen.findByRole('heading', { level: 1, name: 'Our sponsors' })
    // Once, as the heading, and not again on a white tile.
    expect(screen.getAllByText('the Bose family')).toHaveLength(1)
  })

  it('puts the names straight under the page title when there is only one group', async () => {
    renderAt('/sponsors', withSponsors({ sponsors: [LIST[0]] }), undefined)
    expect(await screen.findByRole('heading', { level: 2, name: 'Raj Sweets' })).toBeInTheDocument()
  })

  it('opens on the sponsor a shared link names, without saying not found first', async () => {
    const scrolled: string[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.id)
    }
    try {
      renderAt('/sponsors#bose-family', withSponsors(), undefined)
      // The gate waits for the switches rather than drawing "not found" on the code's values.
      expect(screen.queryByText(/not found/i)).not.toBeInTheDocument()
      await screen.findByRole('heading', { level: 1, name: 'Our sponsors' })
      await waitFor(() => expect(scrolled).toContain('bose-family'))
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('offers to take a name down', async () => {
    renderAt('/sponsors', withSponsors(), undefined)
    expect(await screen.findByText(/would rather not be\?/)).toHaveTextContent(/within three days/)
  })

  it('has no automatic violations', async () => {
    const { container } = renderAt('/sponsors', withSponsors(), undefined)
    await screen.findByRole('heading', { level: 1, name: 'Our sponsors' })
    await expectNoAxeViolations(container)
  })
})

describe('the logos on the home page', () => {
  it('sends each logo to its sponsor on the sponsors page, named by its alt text', async () => {
    renderWithProviders(<SponsorsStrip />, { api: withSponsors() })
    const strip = await screen.findByRole('region', { name: 'Our sponsors' })
    const raj = within(strip).getByRole('link', { name: 'Raj Sweets' })
    expect(raj).toHaveAttribute('href', '/sponsors#raj-sweets')
    expect(within(raj).getByRole('img')).toHaveAttribute('alt', 'Raj Sweets')
    // No logo: the name is drawn on the tile instead.
    expect(within(strip).getByRole('link', { name: 'the Bose family' })).toBeInTheDocument()
  })

  it('draws nothing at all while nobody is on show', async () => {
    const { container } = renderWithProviders(<SponsorsStrip />, {
      api: withSponsors({ sponsors: [sponsor({ id: 'h', name: 'Hidden', shown: false })] }),
    })
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('is on the home page only while the switch is on', async () => {
    renderAt('/', withSponsors({ showSponsors: false }), undefined)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: 'Our sponsors' })).not.toBeInTheDocument()
  })
})

describe('the garland and the diyas', () => {
  /** A stand-in for the browser's "is this on screen yet", which jsdom does not have. */
  function stubInView() {
    const seen: ((entries: { isIntersecting: boolean }[]) => void)[] = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          seen.push(callback)
        }
        observe() {}
        disconnect() {}
      },
    )
    return () => act(() => seen.forEach((callback) => callback([{ isIntersecting: true }])))
  }

  afterEach(() => vi.unstubAllGlobals())

  it('is simply there, lamps lit, in a browser that cannot say when it is in view', async () => {
    renderWithProviders(<SponsorsStrip />, { api: withSponsors() })
    const strip = await screen.findByRole('region', { name: 'Our sponsors' })
    expect(strip).toHaveAttribute('data-motion', 'still')
  })

  it('waits to be seen, then plays once', async () => {
    const comeIntoView = stubInView()
    renderWithProviders(<SponsorsStrip />, { api: withSponsors() })
    const strip = await screen.findByRole('region', { name: 'Our sponsors' })
    expect(strip).toHaveAttribute('data-motion', 'waiting')
    comeIntoView()
    expect(strip).toHaveAttribute('data-motion', 'playing')
  })

  it('stays still for anybody who has asked for less movement', async () => {
    stubInView()
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    renderWithProviders(<SponsorsStrip />, { api: withSponsors() })
    expect(await screen.findByRole('region', { name: 'Our sponsors' })).toHaveAttribute('data-motion', 'still')
  })

  it('keeps the garland and the lamps out of what a screen reader reads', async () => {
    renderWithProviders(<SponsorsStrip />, { api: withSponsors() })
    const strip = await screen.findByRole('region', { name: 'Our sponsors' })
    // The only list a screen reader is told about is the logos.
    expect(within(strip).getAllByRole('list')).toHaveLength(2)
    expect(within(strip).getAllByRole('link').map((link) => link.getAttribute('href'))).not.toContain(null)
  })
})

describe('sponsored by, under a festival', () => {
  it('says co-sponsored for two or more, linking each to the sponsors page', async () => {
    renderWithProviders(<SponsoredBy festivalId="mahalaya" />, { api: withSponsors() })
    const line = await screen.findByText(/Co-sponsored by/)
    expect(line).toHaveTextContent('Co-sponsored by Raj Sweets and the Bose family.')
    expect(within(line).getByRole('link', { name: 'Raj Sweets' })).toHaveAttribute('href', '/sponsors#raj-sweets')
  })

  it('says sponsored for one, and can leave the names unlinked', async () => {
    renderWithProviders(<SponsoredBy festivalId="mahalaya" linked={false} />, {
      api: withSponsors({ sponsors: [LIST[0]] }),
    })
    const line = await screen.findByText('Sponsored by Raj Sweets.')
    expect(within(line).queryByRole('link')).not.toBeInTheDocument()
  })

  it('is on the evening of a sponsored festival', async () => {
    renderAt('/events/mahalaya-cultural-programme-2026', withSponsors(), undefined)
    expect(await screen.findByText(/Co-sponsored by/)).toBeInTheDocument()
  })

  it('says nothing while sponsors are switched off', async () => {
    const { container } = renderWithProviders(<SponsoredBy festivalId="mahalaya" />, {
      api: withSponsors({ showSponsors: false }),
    })
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})

describe('what was saved', () => {
  it('keeps a saved list, and falls back when what was saved is not a list', () => {
    expect(mergeSettings({ sponsors: [{ name: 'Kept' }] }, defaultSettings).sponsors.map((s) => s.name)).toEqual(['Kept'])
    expect(mergeSettings({ sponsors: 'nonsense' }, defaultSettings).sponsors).toEqual(defaultSettings.sponsors)
  })
})

describe('the committee’s screen', () => {
  /** Its own screen, opened once what is saved has been read. */
  const openSponsors = async () => {
    const list = await screen.findByRole('form', { name: 'The sponsors' })
    return list
  }

  it('says sponsors are switched off while they are', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    expect(screen.getByText(/Switched off\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show them on the website' })).toBeInTheDocument()
    expect(within(panel).getByText(/No sponsors yet/)).toBeInTheDocument()
  })

  it('adds a sponsor and saves it', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    await userEvent.type(within(panel).getByLabelText('Sponsor 1'), 'Raj Sweets')
    await userEvent.click(within(panel).getByLabelText('Mahalaya programme'))
    // The switch starts off, so nobody is on the site yet: the summary says they are ready.
    expect(panel).toHaveTextContent('1 ready')

    await userEvent.click(within(panel).getByRole('button', { name: 'Save the sponsors' }))
    expect(await screen.findByText('Saved. The site changes for everybody straight away.')).toHaveAttribute('role', 'status')
  })

  it('is its own screen in the sidebar, not a section of Content', async () => {
    renderAt('/admin')
    expect(await screen.findByRole('link', { name: /^Sponsors/ })).toHaveAttribute('href', '/admin/sponsors')
  })

  it('switches the sponsors on from the same screen', async () => {
    renderAt('/admin/sponsors')
    await openSponsors()
    await userEvent.click(screen.getByRole('button', { name: 'Show them on the website' }))
    expect(await screen.findByText('Saved. The site changes for everybody straight away.')).toHaveAttribute('role', 'status')
  })

  it('has Add and Save together at the top, above the sponsors', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    const save = within(panel).getByRole('button', { name: 'Save the sponsors' })
    const name = within(panel).getByLabelText('Sponsor 1')
    expect(save.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('takes a sponsor off the website with the switch at the top of their card', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    await userEvent.type(within(panel).getByLabelText('Sponsor 1'), 'Raj Sweets')
    const onSite = within(panel).getByRole('switch', { name: 'On the website' })
    expect(onSite).toBeChecked()
    await userEvent.click(onSite)
    expect(onSite).not.toBeChecked()
    expect(within(panel).getByText('Hidden')).toBeInTheDocument()
  })

  it('says how long a name and a line can be, and how big a logo should be', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    await userEvent.type(within(panel).getByLabelText('Sponsor 1'), 'Raj Sweets')
    expect(within(panel).getByText('10 of 60')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Sponsor 1')).toHaveAttribute('maxLength', '60')
    expect(within(panel).getByText('What makes a good logo, and how big it is drawn')).toBeInTheDocument()
    expect(within(panel).getByText(/At least 600 pixels wide/)).toBeInTheDocument()
  })

  it('keeps a family off the site until they have said yes', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    await userEvent.type(within(panel).getByLabelText('Sponsor 1'), 'the Bose family')
    await userEvent.click(within(panel).getByLabelText('A person or a family, not a business'))

    expect(within(panel).getAllByText(/Waiting for their agreement/).length).toBeGreaterThan(0)
    expect(panel).toHaveTextContent('1 waiting for agreement')

    await userEvent.click(within(panel).getByLabelText('They have said yes to their name being on the website'))
    expect(panel).toHaveTextContent('1 ready')
    expect(within(panel).getByText(/Thank you. Check how they would like their name written/)).toBeInTheDocument()
  })

  it('will not take a website or a logo that is not https', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    await userEvent.type(within(panel).getByLabelText('Their website'), 'javascript:alert(1)')
    await userEvent.type(within(panel).getByLabelText('Or the address of their logo'), 'http://x.example/logo.png')
    expect(within(panel).getByText(/saved without a link/)).toBeInTheDocument()
    expect(within(panel).getByText(/saved without a logo/)).toBeInTheDocument()
  })

  it('gives a website written the everyday way the https it was missing', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    await userEvent.type(within(panel).getByLabelText('Their website'), 'www.rajsweets.co.uk')
    expect(within(panel).getByText(/Saved as https:\/\/www.rajsweets.co.uk/)).toBeInTheDocument()
    expect(within(panel).queryByText(/saved without a link/)).not.toBeInTheDocument()
  })

  it('asks for a logo, not a photograph', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    expect(within(panel).getByText('Drag their logo here')).toBeInTheDocument()
  })

  it('asks before removing a sponsor somebody has named', async () => {
    renderAt('/admin/sponsors')
    const panel = await openSponsors()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a sponsor' }))
    await userEvent.type(within(panel).getByLabelText('Sponsor 1'), 'Raj Sweets')
    await userEvent.click(within(panel).getByRole('button', { name: 'Remove Raj Sweets' }))

    const dialog = await screen.findByRole('dialog', { name: 'Remove Raj Sweets?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove them' }))
    expect(within(panel).queryByLabelText('Sponsor 1')).not.toBeInTheDocument()
  })
})
