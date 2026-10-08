import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import { routes } from '@/app/router'
import { SITE_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from '@/app/theme/themes'
import type { SiteSettings } from '@/domain/settings'
import type { ApiClient } from '@/lib/api'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { createTestApi, TestDataProviders } from '@/test/render'

/*
 * Longer than the rest. Each test here edits a section and then reads the public page it changes,
 * a dozen steps through the whole portal, and CI's coverage run takes five to seven times as long
 * as a laptop: the longest took 16.8 of its 20 seconds there before the portal grew a few more
 * screens, and 21 after. Raised for this file rather than for every test, so a test elsewhere that
 * slows down still says so.
 */
vi.setConfig({ testTimeout: 45_000 })

/**
 * The parts of the site that used to be files, edited from the portal and then looked at as a
 * visitor would.
 *
 * Every test here goes the whole way round — change it on the committee's screen, save it,
 * open the public page — because the failure worth catching is the one the screen cannot show:
 * a section that saves, says "Saved", and changes nothing anybody else can see.
 */
const admin = previewAccounts[1]

function renderAt(path: string, { api = createTestApi(), session = admin }: { api?: ApiClient; session?: typeof admin } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <TestDataProviders session={session} api={api}>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  return { router, api }
}

/** A client whose saved settings differ from the code's, as the live site's do. */
function apiWith(changes: Partial<SiteSettings>): ApiClient {
  const api = createTestApi()
  const saved = { ...defaultSettings, ...changes }
  return { ...api, settings: { ...api.settings, get: async () => saved }, festivals: { list: async () => saved.festivals } }
}

/** The panel, once the form in it has opened. */
async function panel() {
  const region = await screen.findByRole('region', { name: 'What the site shows' })
  await within(region).findByRole('button', { name: 'Save the switches' })
  return region
}

/** Opens one section, which is when its fields are first drawn. */
async function open(region: HTMLElement, name: RegExp) {
  await userEvent.click(within(region).getByRole('button', { name }))
}

/**
 * Puts text in a box the way somebody pastes it, in one go.
 *
 * Typed a key at a time, every character redraws the whole form, and a web address is forty of
 * them. The tests here are about what happens once the text is in, not about the typing.
 */
async function fill(box: HTMLElement, text: string) {
  await userEvent.clear(box)
  await userEvent.click(box)
  await userEvent.paste(text)
}

const saved = (region: HTMLElement) => waitFor(() => expect(within(region).getByRole('status')).toHaveTextContent('Saved.'))

beforeEach(() => {
  localStorage.clear()
})

/*
 * Longer than the usual five seconds, on purpose.
 *
 * Each of these draws the committee's whole settings screen, changes it, saves, and then draws
 * a public page — two of the largest screens in the app in one test. On a laptop that is under
 * a second. Under coverage on a shared CI runner, with every other file running beside it, it
 * has been five times that, and a test that fails only when the machine is busy teaches people
 * to re-run rather than to read.
 */
vi.setConfig({ testTimeout: 20_000 })

describe('the year’s festivals', () => {
  it('adds one from the portal, and the home page has it', async () => {
    const { router } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /The year’s festivals/)

    await userEvent.click(within(region).getByRole('button', { name: 'Add a festival' }))
    await fill(within(region).getByLabelText('Festival 5'), 'Rabindra Jayanti')
    await fill(within(region).getByLabelText('What happens at Rabindra Jayanti'), 'Songs and recitation for Tagore’s birthday.')
    await userEvent.click(within(region).getByRole('button', { name: 'Save the festivals' }))
    await saved(region)

    await act(() => router.navigate('/'))
    const year = await screen.findByRole('region', { name: 'Our year' })
    const link = await within(year).findByRole('link', { name: 'Rabindra Jayanti' })
    // Filed under an id made from its name, which is what the Events filter reads.
    expect(link).toHaveAttribute('href', '/events?festival=rabindra-jayanti')
  })

  it('takes one off, and it is gone from the home page', async () => {
    const { router } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /The year’s festivals/)

    await userEvent.click(within(region).getByRole('button', { name: 'Remove Holi' }))
    await userEvent.click(within(region).getByRole('button', { name: 'Save the festivals' }))
    await saved(region)

    await act(() => router.navigate('/'))
    const year = await screen.findByRole('region', { name: 'Our year' })
    await within(year).findByRole('link', { name: 'Saraswati Puja' })
    expect(within(year).queryByRole('link', { name: 'Holi' })).not.toBeInTheDocument()
  })

  it('does not draw the fields until the section is opened', async () => {
    renderAt('/admin/content')
    const region = await panel()
    // Eight lists drawn at once made every keystroke on this screen redraw all of them.
    expect(within(region).queryByLabelText('Festival 1')).not.toBeInTheDocument()
    await open(region, /The year’s festivals/)
    expect(within(region).getByLabelText('Festival 1')).toHaveValue('Boishakhi')
  })
})

describe('ways to reach us', () => {
  it('changes the address in the footer of the public site', async () => {
    const { router } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /Ways to reach us/)

    await fill(within(region).getByLabelText('Address of Facebook'), 'https://www.facebook.com/13parbon')
    await userEvent.click(within(region).getByRole('button', { name: 'Save the channels' }))
    await saved(region)

    await act(() => router.navigate('/'))
    const footer = await screen.findByRole('contentinfo')
    await waitFor(() =>
      expect(within(footer).getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/13parbon'),
    )
  })

  it('says so beside the box when an address is not one, before anybody saves it', async () => {
    renderAt('/admin/content')
    const region = await panel()
    await open(region, /Ways to reach us/)

    const address = within(region).getByLabelText('Address of Instagram')
    await fill(address, 'instagram.com/13parbon')
    expect(address).toHaveAttribute('aria-invalid', 'true')
    expect(within(region).getByText(/would be saved without a link/)).toBeInTheDocument()
  })

  it('sends the Volunteer button on an event to the committee’s own form', async () => {
    const api = apiWith({ volunteerFormUrl: 'https://forms.example/help' })
    renderAt('/events/mahalaya-cultural-programme-2026', { api, session: admin })
    await screen.findByRole('link', { name: 'Volunteer' })
    // The contact page until the settings arrive, which is the fallback doing its job. Asked
    // for again inside the wait: a link to another site is a different element from a route.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Volunteer' })).toHaveAttribute('href', 'https://forms.example/help'),
    )
  })
})

describe('the About page', () => {
  it('shows the story as the committee last saved it, headings and lists and all', async () => {
    const { router } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /Our story/)

    // Pasted rather than typed, which is how a story arrives.
    await fill(
      within(region).getByLabelText('The story, as it reads on the About page'),
      'We began in 2022.\n\n# What we hold\n\n- A spring gathering\n- A night of colours',
    )
    await userEvent.click(within(region).getByRole('button', { name: 'Save the story' }))
    await saved(region)

    await act(() => router.navigate('/about'))
    expect(await screen.findByText('We began in 2022.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'What we hold' })).toBeInTheDocument()
    expect(screen.getByText('A night of colours').tagName).toBe('LI')
  })

  it('takes the heading away with the story, rather than leaving a title over nothing', async () => {
    renderAt('/about', { api: apiWith({ story: [], values: [] }) })
    await screen.findByRole('heading', { level: 2, name: /Current committee/ })
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'Our story' })).not.toBeInTheDocument())
    expect(screen.queryByRole('heading', { level: 2, name: 'What we stand for' })).not.toBeInTheDocument()
  })
})

describe('what we stand for', () => {
  it('adds a value from the portal, and the About page has it', async () => {
    const { router } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /What we stand for/)

    await userEvent.click(within(region).getByRole('button', { name: 'Add a value' }))
    await fill(within(region).getByLabelText('Value 5'), 'Food first')
    await fill(within(region).getByLabelText('What Food first means'), 'Nobody leaves hungry.')
    await userEvent.selectOptions(within(region).getAllByLabelText('Its drawing')[4], 'sparkle')
    // And one taken off, by name.
    await userEvent.click(within(region).getByRole('button', { name: 'Remove Open door' }))
    await userEvent.click(within(region).getByRole('button', { name: 'Save the values' }))
    await saved(region)

    await act(() => router.navigate('/about'))
    expect(await screen.findByRole('heading', { level: 3, name: 'Food first' })).toBeInTheDocument()
    expect(screen.getByText('Nobody leaves hungry.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Open door' })).not.toBeInTheDocument()
  })
})

describe('moving a row', () => {
  it('puts a festival earlier in the year, and will not move the first one up', async () => {
    const { api } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /The year’s festivals/)

    expect(within(region).getByRole('button', { name: 'Move Boishakhi up' })).toBeDisabled()
    expect(within(region).getByRole('button', { name: 'Move Holi down' })).toBeDisabled()

    await userEvent.click(within(region).getByRole('button', { name: 'Move Holi up' }))
    await userEvent.click(within(region).getByRole('button', { name: 'Save the festivals' }))
    await saved(region)
    expect((await api.settings.get()).festivals.map((f) => f.id)).toEqual(['boishakhi', 'mahalaya', 'holi', 'saraswati-puja'])
  })

  it('adds a channel with its own mark, and drops one left without a name', async () => {
    const { api } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /Ways to reach us/)

    await userEvent.click(within(region).getByRole('button', { name: 'Add a channel' }))
    await fill(within(region).getByLabelText('Channel 4'), 'YouTube')
    await userEvent.selectOptions(within(region).getAllByLabelText('Its mark')[3], 'youtube')
    await fill(within(region).getByLabelText('Address of YouTube'), 'https://www.youtube.com/@13parbon')
    await fill(within(region).getByLabelText('What YouTube is for'), 'Recordings of the programmes.')
    // A second one started and abandoned.
    await userEvent.click(within(region).getByRole('button', { name: 'Add a channel' }))
    await fill(within(region).getByLabelText('Form for offers to help'), 'https://forms.example/help')
    await userEvent.click(within(region).getByRole('button', { name: 'Save the channels' }))
    await saved(region)

    const { social, volunteerFormUrl } = await api.settings.get()
    expect(social).toHaveLength(4)
    expect(social[3]).toEqual({
      name: 'YouTube',
      icon: 'youtube',
      href: 'https://www.youtube.com/@13parbon',
      blurb: 'Recordings of the programmes.',
    })
    expect(volunteerFormUrl).toBe('https://forms.example/help')
  })
})

describe('this year’s theme, in photographs', () => {
  it('rewrites a caption from the portal, and the event’s page shows it', async () => {
    const { router } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /This year’s theme, in photographs/)

    await fill(within(region).getByLabelText('Caption of photograph 2'), 'The last tram to Esplanade')
    await fill(within(region).getByLabelText('What the collage is called'), 'Trams, then and now')
    await fill(within(region).getByLabelText('Who took them'), '')
    await userEvent.click(within(region).getByRole('button', { name: 'Remove photograph 6' }))
    await userEvent.click(within(region).getByRole('button', { name: 'Save the photographs' }))
    await saved(region)

    await act(() => router.navigate('/events/mahalaya-cultural-programme-2026'))
    expect(await screen.findByRole('button', { name: 'See The last tram to Esplanade full size' })).toBeInTheDocument()
    // Five now, where there were six.
    expect(screen.getAllByRole('button', { name: /^See .* full size$/ })).toHaveLength(5)
    // The credit was emptied, and an empty credit is left off rather than printed as nothing.
    expect(screen.queryByText(/Photographs by/)).not.toBeInTheDocument()
  })

  it('keeps the name a collage had when the box is emptied, because a screen reader needs one', async () => {
    const { api } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /This year’s theme, in photographs/)

    await fill(within(region).getByLabelText('What the collage is called'), '   ')
    await userEvent.click(within(region).getByRole('button', { name: 'Move photograph 2 up' }))
    await userEvent.click(within(region).getByRole('button', { name: 'Save the photographs' }))
    await saved(region)

    const { collage } = await api.settings.get()
    expect(collage.label).toBe(defaultSettings.collage.label)
    expect(collage.photos[0].src).toBe('/theme/tram.jpg')
  })

  it('says where a new photograph cannot go when there is no bucket, rather than failing', async () => {
    renderAt('/admin/content')
    const region = await panel()
    await open(region, /This year’s theme, in photographs/)
    // The same upload the gallery and the event cover use, so it strips a photograph's
    // location and camera before it leaves the machine, and says so when it has nowhere to send.
    expect(within(region).getByText('Add a photograph for the theme')).toBeInTheDocument()
  })
})

describe('the home page', () => {
  it('is drawn in the order the committee put it in', async () => {
    const order: SiteSettings['homeOrder'] = ['yearStrip', 'whoWeAre', 'notices', 'nextEvent', 'photos', 'upcoming', 'volunteer', 'feedback']
    renderAt('/', { api: apiWith({ homeOrder: order }) })

    const year = await screen.findByRole('region', { name: 'Our year' })
    const who = screen.getByRole('region', { name: 'Who we are' })
    // "Our year" now comes before "Who we are", which the code would have put the other way.
    await waitFor(() =>
      expect(year.compareDocumentPosition(who) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(),
    )
  })

  it('moves a part up from the portal, and saves the new order', async () => {
    const { api } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /The home page: its order/)

    await userEvent.click(within(region).getByRole('button', { name: 'Move Photographs up' }))
    await userEvent.click(within(region).getByRole('button', { name: 'Save the home page' }))
    await saved(region)

    const { homeOrder } = await api.settings.get()
    expect(homeOrder.indexOf('photos')).toBeLessThan(homeOrder.indexOf('whoWeAre'))
  })

  it('reads its closing invitation from the settings', async () => {
    renderAt('/', { api: apiWith({ text: { ...defaultSettings.text, joinTitle: 'Come to Saraswati Puja.' } }) })
    expect(await screen.findByRole('region', { name: 'Come to Saraswati Puja.' })).toBeInTheDocument()
  })
})

describe('the colours a visitor arrives to', () => {
  it('paints a first visit in the committee’s choice, and remembers it for the next', async () => {
    renderAt('/', { api: apiWith({ defaultTheme: 'holi' }) })
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('holi'))
    // So the next visit opens in these colours at once, rather than red and then magenta.
    expect(localStorage.getItem(SITE_THEME_STORAGE_KEY)).toBe('holi')
  })

  it('leaves alone somebody who has chosen their own', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'saraswati')
    renderAt('/', { api: apiWith({ defaultTheme: 'holi' }) })
    await screen.findByRole('region', { name: 'Who we are' })
    // Long enough for the settings to have arrived and been ignored.
    await waitFor(() => expect(localStorage.getItem(SITE_THEME_STORAGE_KEY)).toBe('holi'))
    expect(document.documentElement.dataset.theme).toBe('saraswati')
  })

  it('is chosen from the portal', async () => {
    const { api } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /The colours a visitor arrives to/)

    await userEvent.selectOptions(within(region).getByLabelText('The season’s look'), 'mahalaya')
    await userEvent.click(within(region).getByRole('button', { name: 'Save the colours' }))
    await saved(region)
    expect((await api.settings.get()).defaultTheme).toBe('mahalaya')
  })
})

describe('the privacy notice', () => {
  it('shows the committee’s wording, dated the day they changed it', async () => {
    const { router } = renderAt('/admin/content')
    const region = await panel()
    await open(region, /The privacy notice/)

    await fill(
      within(region).getByLabelText('What it says under Your rights'),
      'Ask us what we hold about you and we will tell you within a month.',
    )
    await userEvent.click(within(region).getByRole('button', { name: 'Save the notice' }))
    await saved(region)

    await act(() => router.navigate('/privacy'))
    expect(await screen.findByText('Ask us what we hold about you and we will tell you within a month.')).toBeInTheDocument()
    // The test clock stands at 3 September 2026: the date moved because the words did.
    expect(screen.getByText(/Last updated 3 September 2026/)).toBeInTheDocument()
  })

  it('will not save a notice with nothing in it', async () => {
    renderAt('/admin/content')
    const region = await panel()
    await open(region, /The privacy notice/)

    // Asked for afresh each time: taking a row out redraws the ones after it.
    const removes = () =>
      within(region).queryAllByRole('button', {
        name: /^Remove (What we collect|Why we use it|Cookies and tracking|Your name and your photographs|Your rights)$/,
      })
    expect(removes()).toHaveLength(5)
    while (removes().length > 0) await userEvent.click(removes()[0])
    expect(within(region).getByText(/A notice needs at least one section/)).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Save the notice' })).toBeDisabled()
  })

  it('says when the developer has rewritten the notice since the committee edited theirs', async () => {
    const stale = { ...defaultSettings.privacy, basedOn: '1 January 2026', sections: [{ title: 'What we collect', body: ['Only your name.'] }] }
    renderAt('/admin/content', { api: apiWith({ privacy: stale }) })
    const region = await panel()
    await open(region, /The privacy notice/)

    const warning = within(region).getByRole('alert')
    expect(warning).toHaveTextContent('The site has changed since this notice was written.')

    // Taking the developer's version fills the form with it; nothing is saved until Save.
    await userEvent.click(within(warning).getByRole('button', { name: 'Start again from the developer’s version' }))
    expect(within(region).getByLabelText('Heading 2')).toHaveValue('Why we use it')
    expect(within(region).getByRole('button', { name: 'Save the notice' })).toBeEnabled()
  })

  it('lets the committee say theirs is still right, without moving its date', async () => {
    const stale = { ...defaultSettings.privacy, updatedOn: '2 February 2026', basedOn: '1 January 2026' }
    const api = createTestApi()
    // Saved for real, so the save below is laid over it the way the live site's would be.
    await api.settings.save({ ...defaultSettings, privacy: stale }, { householdId: admin.householdId, role: 'admin' })
    renderAt('/admin/content', { api })
    const region = await panel()
    await open(region, /The privacy notice/)

    expect(within(region).getByRole('button', { name: 'Save the notice' })).toBeDisabled()
    await userEvent.click(within(region).getByRole('button', { name: 'Ours is still right' }))
    await userEvent.click(within(region).getByRole('button', { name: 'Save the notice' }))
    await saved(region)

    const { privacy } = await api.settings.get()
    expect(privacy.basedOn).toBe(defaultSettings.privacy.updatedOn)
    // Reviewing a notice is not rewriting it.
    expect(privacy.updatedOn).toBe('2 February 2026')
    await waitFor(() => expect(within(region).queryByRole('alert')).not.toBeInTheDocument())
  })
})

describe('the committee’s other tools', () => {
  it('adds a link to the portal’s sidebar', async () => {
    renderAt('/admin/content')
    const region = await panel()
    await open(region, /Other tools the committee runs/)

    await userEvent.click(within(region).getByRole('button', { name: 'Add a tool' }))
    await fill(within(region).getByLabelText('Tool 2'), 'Accounts')
    await fill(within(region).getByLabelText('Address of Accounts'), 'https://sheets.example/accounts')
    await userEvent.click(within(region).getByRole('button', { name: 'Save the tools' }))
    await saved(region)

    const sidebar = screen.getByRole('navigation', { name: 'Other tools' })
    await waitFor(() =>
      expect(within(sidebar).getByRole('link', { name: /Accounts/ })).toHaveAttribute('href', 'https://sheets.example/accounts'),
    )
  })
})

describe('waiting for what is saved', () => {
  it('does not open the form on the code’s own values while the settings are still on their way', async () => {
    const api = createTestApi()
    let arrive: (settings: SiteSettings) => void = () => {}
    const slow: ApiClient = {
      ...api,
      settings: { ...api.settings, get: () => new Promise<SiteSettings>((resolve) => (arrive = resolve)) },
    }
    renderAt('/admin/content', { api: slow })
    const region = await screen.findByRole('region', { name: 'What the site shows' })

    // Opened now, every section that differs from the code would offer to save the code's
    // version over the committee's.
    expect(within(region).getByRole('status')).toHaveTextContent('Reading what is saved')
    expect(within(region).queryByRole('button', { name: 'Save the switches' })).not.toBeInTheDocument()

    await act(async () => arrive({ ...defaultSettings, showNews: true }))
    await within(region).findByRole('button', { name: 'Save the switches' })
    expect(within(region).getByLabelText('News and newsletters')).toBeChecked()
  })
})
