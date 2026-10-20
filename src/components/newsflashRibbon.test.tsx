import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import { routes } from '@/app/router'
import { blankNewsflash, tidyNewsflashes, type Newsflash } from '@/domain/newsflash'
import type { SiteSettings } from '@/domain/settings'
import { createMockApi, type ApiClient } from '@/lib/api'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { expectNoAxeViolations } from '@/test/axe'
import { TestDataProviders } from '@/test/render'
import { NEWSFLASH_CLOSED_KEY } from './NewsflashRibbon'

const NOW = new Date('2026-10-24T12:00:00Z')

const flash = (over: Partial<Newsflash>): Newsflash => ({
  ...blankNewsflash(NOW),
  tag: 'New feature',
  tagBn: 'নতুন',
  headlineBn: 'বাংলা ক্যালেন্ডার এসে গেছে!',
  headline: 'The Bengali calendar is here',
  line: 'Every puja, both panjikas, UK and India times.',
  to: '/calendar',
  button: 'See the calendar',
  from: '2026-10-20T09:00:00.000Z',
  until: '2026-11-03T09:00:00.000Z',
  ...over,
})

function withSettings(over: Partial<SiteSettings>): ApiClient {
  const base = createMockApi()
  const settings = { ...defaultSettings, ...over }
  return { ...base, settings: { ...base.settings, get: async () => settings } }
}

function renderAt(path: string, api: ApiClient | undefined, session?: (typeof previewAccounts)[number]) {
  return render(
    <TestDataProviders api={api} now={NOW} session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

const ribbon = () => screen.findByRole('region', { name: 'News from the committee' })

afterEach(() => localStorage.clear())

describe('the newsflash ribbon', () => {
  it('carries the kind, the headlines, the line and a button to the page', async () => {
    renderAt('/', withSettings({ newsflashes: tidyNewsflashes([flash({})]) }))
    const strip = await ribbon()
    expect(within(strip).getByText('নতুন')).toHaveAttribute('lang', 'bn')
    expect(within(strip).getByText('New feature')).toBeInTheDocument()
    expect(within(strip).getByText('বাংলা ক্যালেন্ডার এসে গেছে!')).toBeInTheDocument()
    expect(within(strip).getByText('The Bengali calendar is here')).toBeInTheDocument()
    expect(within(strip).getByRole('link', { name: 'See the calendar' })).toHaveAttribute('href', '/calendar')
  })

  it('moves the way the committee picked, and runs a ticker with its copy hidden from screen readers', async () => {
    renderAt('/', withSettings({ newsflashes: tidyNewsflashes([flash({ animation: 'marquee' })]) }))
    const strip = await ribbon()
    expect(strip).toHaveAttribute('data-animation', 'marquee')
    // Two copies on screen for the loop; only one is read out.
    const copies = within(strip).getAllByText('The Bengali calendar is here')
    expect(copies).toHaveLength(2)
    expect(copies.filter((copy) => copy.closest('[aria-hidden="true"]'))).toHaveLength(1)
  })

  it('wears the website’s own colours when the committee picks Theme', async () => {
    renderAt('/', withSettings({ newsflashes: tidyNewsflashes([flash({ colour: 'theme' })]) }))
    expect(await ribbon()).toHaveAttribute('data-colour', 'theme')
  })

  it('is on every public page, not only the home page', async () => {
    renderAt('/about', withSettings({ newsflashes: tidyNewsflashes([flash({})]) }))
    expect(await ribbon()).toBeInTheDocument()
  })

  it('is not there before it goes up or after it comes down', async () => {
    renderAt('/', withSettings({ newsflashes: tidyNewsflashes([flash({ from: '2026-10-30T09:00:00.000Z' }), flash({ until: '2026-10-21T09:00:00.000Z' })]) }))
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: 'News from the committee' })).not.toBeInTheDocument()
  })

  it('has no button when it takes people nowhere', async () => {
    renderAt('/', withSettings({ newsflashes: tidyNewsflashes([flash({ to: '' })]) }))
    expect(within(await ribbon()).queryByRole('link')).not.toBeInTheDocument()
  })

  it('moves between up to three with arrows, the one marked first leading', async () => {
    renderAt(
      '/',
      withSettings({
        newsflashes: tidyNewsflashes([
          flash({}),
          flash({ tag: 'Maintenance', headline: 'Down on Saturday', headlineBn: '', colour: 'dark', closable: false, to: '' }),
          flash({ tag: 'Important', headline: 'The venue has changed', headlineBn: '', colour: 'alert', first: true }),
        ]),
      }),
    )
    const strip = await ribbon()
    expect(within(strip).getByText('1 of 3')).toBeInTheDocument()
    expect(within(strip).getByText('The venue has changed')).toBeInTheDocument()
    await userEvent.click(within(strip).getByRole('button', { name: 'Next newsflash' }))
    expect(within(strip).getByText('2 of 3')).toBeInTheDocument()
    expect(within(strip).getByText('The Bengali calendar is here')).toBeInTheDocument()
    await userEvent.click(within(strip).getByRole('button', { name: 'Previous newsflash' }))
    await userEvent.click(within(strip).getByRole('button', { name: 'Previous newsflash' }))
    expect(within(strip).getByText('Down on Saturday')).toBeInTheDocument()
    expect(within(strip).queryByRole('button', { name: 'Close this newsflash' })).not.toBeInTheDocument()
  })

  it('stays closed for a visitor who closed it', async () => {
    const rows = tidyNewsflashes([flash({})])
    const api = withSettings({ newsflashes: rows })
    const { unmount } = renderAt('/', api)
    await userEvent.click(within(await ribbon()).getByRole('button', { name: 'Close this newsflash' }))
    expect(screen.queryByRole('region', { name: 'News from the committee' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(NEWSFLASH_CLOSED_KEY)!)).toEqual([rows[0].id])

    unmount()
    renderAt('/', api)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: 'News from the committee' })).not.toBeInTheDocument()
  })

  it('has no automatic accessibility violations in any of its colours', async () => {
    for (const colour of ['theme', 'gold', 'dark', 'alert'] as const) {
      const { container, unmount } = renderAt('/', withSettings({ newsflashes: tidyNewsflashes([flash({ colour })]) }))
      await ribbon()
      await expectNoAxeViolations(container)
      unmount()
    }
  })
})

describe('the newsflash screen in the portal', () => {
  const admin = previewAccounts[1]
  const list = () => screen.findByRole('form', { name: 'The newsflashes' })

  it('is in the sidebar with the website’s screens', async () => {
    renderAt('/admin', withSettings({}), admin)
    const nav = await screen.findByRole('navigation', { name: 'Committee' })
    expect(within(nav).getByRole('link', { name: /Newsflash/ })).toHaveAttribute('href', '/admin/newsflash')
  })

  it('writes a newsflash and saves it', async () => {
    // The mock that keeps what it is sent, so the screen sees its own save come back.
    renderAt('/admin/newsflash', undefined, admin)
    const form = await list()
    await userEvent.click(within(form).getByRole('button', { name: 'Add a newsflash' }))
    const kind = within(form).getByLabelText('What kind, in English')
    expect(kind).toHaveAttribute('placeholder', 'New feature, Important, Maintenance…')
    expect(within(form).getByLabelText('In Bengali, if you like')).toHaveAttribute('placeholder', 'নতুন, জরুরি, রক্ষণাবেক্ষণ…')
    await userEvent.type(kind, 'Maintenance')
    await userEvent.type(within(form).getByLabelText('Headline in English'), 'The site is down on Saturday night')
    await userEvent.click(within(form).getByLabelText('Dark'))
    expect(within(form).getByLabelText('Animation')).toHaveValue('drop')
    await userEvent.selectOptions(within(form).getByLabelText('Animation'), 'The words scroll across, like a news ticker')
    await userEvent.click(within(form).getByLabelText('Visitors can close it'))
    expect(within(form).getByText('Up now')).toBeInTheDocument()

    await userEvent.click(within(form).getByRole('button', { name: 'Save the newsflashes' }))
    expect(await screen.findByText('Saved. The site changes for everybody straight away.')).toHaveAttribute('role', 'status')
  })

  it('opens a new one ready to type into, folding the others away', async () => {
    renderAt('/admin/newsflash', withSettings({ newsflashes: tidyNewsflashes([flash({}), flash({ headline: 'Down on Saturday' })]) }), admin)
    const form = await list()
    const first = within(form).getByRole('button', { name: /^The Bengali calendar is here/ })
    expect(first).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(within(form).getByRole('button', { name: /^Down on Saturday/ })).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(within(form).getByRole('button', { name: 'Add a newsflash' }))
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(within(form).getByRole('button', { name: /^Newsflash 3/ })).toHaveAttribute('aria-expanded', 'true')
    expect(within(form).getAllByLabelText('What kind, in English')[2]).toHaveFocus()
  })

  it('will not save one that is not finished, and says what is missing', async () => {
    renderAt('/admin/newsflash', withSettings({}), admin)
    const form = await list()
    await userEvent.click(within(form).getByRole('button', { name: 'Add a newsflash' }))
    expect(within(form).getByText('Say what kind it is, in English.')).toBeInTheDocument()
    expect(within(form).getByText('Give it a headline, in Bengali or English.')).toBeInTheDocument()
    expect(within(form).getByText('Not finished')).toBeInTheDocument()
  })

  it('will not save a fourth over three that are already up', async () => {
    const three = tidyNewsflashes([1, 2, 3].map((n) => flash({ headline: `Flash ${n}` })))
    renderAt('/admin/newsflash', withSettings({ newsflashes: three }), admin)
    const form = await list()
    await userEvent.click(within(form).getByRole('button', { name: 'Add a newsflash' }))
    const cards = within(form).getAllByLabelText('What kind, in English')
    await userEvent.type(cards[3], 'Important')
    await userEvent.type(within(form).getAllByLabelText('Headline in English')[3], 'The venue has changed')
    expect(within(form).getByRole('alert')).toHaveTextContent(/More than 3 would be up at once from/)
    expect(within(form).getByRole('button', { name: 'Save the newsflashes' })).toBeDisabled()
  })

  it('takes one down in red, asking first', async () => {
    renderAt('/admin/newsflash', withSettings({ newsflashes: tidyNewsflashes([flash({})]) }), admin)
    const form = await list()
    const down = within(form).getByRole('button', { name: 'Take down The Bengali calendar is here' })
    await userEvent.click(down)
    await userEvent.click(await screen.findByRole('button', { name: 'Take it down' }))
    expect(within(form).queryByLabelText('What kind, in English')).not.toBeInTheDocument()
  })
})
