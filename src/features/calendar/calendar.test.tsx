import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { defaultSettings } from '@/app/defaults'
import { publicNav } from '@/app/nav'
import type { ApiClient } from '@/lib/api'
import { expectNoAxeViolations } from '@/test/axe'
import { TestDataProviders, createFailingApi, createTestApi } from '@/test/render'

/** Maha Ashtami, 2 Kartik 1433. */
const ASHTAMI = new Date('2026-10-19T09:00:00')

function api(settings: Partial<typeof defaultSettings> = { showCalendar: true }, base: ApiClient = createTestApi()): ApiClient {
  return { ...base, settings: { ...base.settings, get: async () => ({ ...defaultSettings, ...settings }) } }
}

function renderAt(path: string, client: ApiClient = api(), now = ASHTAMI) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <TestDataProviders api={client} now={now}>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  return { ...view, router }
}

describe('the calendar switch', () => {
  it('is on to begin with', () => {
    expect(defaultSettings.showCalendar).toBe(true)
    expect(publicNav(defaultSettings).map((item) => item.to)).toContain('/calendar')
  })

  it('takes away the link and the page when it is turned off', async () => {
    expect(publicNav({ ...defaultSettings, showCalendar: false }).map((item) => item.to)).not.toContain('/calendar')
    renderAt('/calendar', api({ showCalendar: false }))
    expect(await screen.findByRole('heading', { level: 1, name: /not found|cannot find|nothing here/i })).toBeInTheDocument()
  })

  it('puts Calendar after Events in the header once it is on', () => {
    const nav = publicNav({ ...defaultSettings, showCalendar: true }).map((item) => item.label)
    expect(nav.indexOf('Calendar')).toBe(nav.indexOf('Events') + 1)
  })
})

describe('the calendar page', () => {
  // These read the Bisuddha Siddhanta's dates and times; the page opens on Benimadhab Sil's.
  beforeEach(() => localStorage.setItem('calendar-panjika', 'bisuddha'))
  afterEach(() => localStorage.clear())

  it('opens on the Bengali month it is today, and says what today is', async () => {
    renderAt('/calendar')
    expect(await screen.findByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /কার্তিক ১৪৩৩ Kartik 1433/ })).toBeInTheDocument()
    const today = screen.getByRole('region', { name: 'Today' })
    expect(within(today).getByText('আজ ২ কার্তিক ১৪৩৩')).toBeInTheDocument()
    expect(within(today).getByText('Monday 19 October 2026')).toBeInTheDocument()
    expect(within(today).getByText(/Maha Ashtami: Durga Puja/)).toBeInTheDocument()
  })

  it('is passed on with the month shown and what is on in it', async () => {
    document.head.insertAdjacentHTML('beforeend', '<meta name="description" content="The site’s own line." />')
    renderAt('/calendar')
    await screen.findByRole('heading', { level: 1, name: 'Calendar' })
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content).toBe(
      'Kartik 1433 in the Bengali calendar from 13Parbon Community: Durga Puja, Kojagari Lakshmi Puja, Kali Puja and more, with the times in the UK and India.',
    )
  })

  it('gives today’s times in UK time and India’s, and only today’s', async () => {
    renderAt('/calendar')
    const today = await screen.findByRole('region', { name: 'Today' })
    const sandhi = within(today).getByText('Sandhi Puja').closest('div')!
    // 10:27 in Kolkata is 5:57 in the morning here, in British Summer Time.
    expect(sandhi).toHaveTextContent('UK Mon 19 Oct, 5:57 am – 6:45 amIndia Mon 19 Oct, 10:27 am – 11:15 am')
    expect(within(today).getByText('Navami tithi')).toBeInTheDocument()
    expect(within(today).queryByText('Shashthi tithi')).not.toBeInTheDocument()
  })

  it('shows a sankranti as a moment, with no end', async () => {
    renderAt('/calendar?month=1433-07')
    const kartik = (await screen.findByRole('heading', { level: 4, name: /Kartik Puja/ })).closest('li')!
    expect(kartik).toHaveTextContent('Vrishchika sankrantiUK Mon 16 Nov, 2:18 pmIndia Mon 16 Nov, 7:48 pm')
  })

  it('marks today in the grid, and links a day to what is on it', async () => {
    renderAt('/calendar')
    const grid = await screen.findByRole('table', { name: /Kartik 1433, 18 October – 16 November 2026/ })
    const today = within(grid).getByRole('link', { name: /Monday 19 October\. Today\. Maha Ashtami, Durga Puja\./ })
    expect(today).toHaveAttribute('href', '#entry-durga-puja-2026')
    expect(today.closest('td')).toHaveAttribute('aria-current', 'date')
  })

  it('fills the last week with the next month’s days, faded and not links', async () => {
    renderAt('/calendar')
    const grid = await screen.findByRole('table', { name: /Kartik 1433/ })
    // 30 Kartik is a Monday, so Tuesday to Saturday are 1 to 5 Agrahayan, the first one named.
    const rows = within(grid).getAllByRole('row')
    const last = rows[rows.length - 1]
    const cells = within(last).getAllByRole('cell')
    expect(cells).toHaveLength(7)
    expect(cells[2]).toHaveTextContent('১ অগ্রহায়ণ17')
    expect(cells[6]).toHaveTextContent('৫21')
    for (const cell of cells.slice(2)) expect(within(cell).queryByRole('link')).not.toBeInTheDocument()
  })

  it('says a puja that began last month continues from it', async () => {
    renderAt('/calendar')
    const item = await screen.findByRole('heading', { level: 4, name: /Durga Puja/ })
    expect(item.closest('li')).toHaveTextContent('continues from Ashwin')
    expect(screen.getByText('Sat 17 – Wed 21 Oct', { exact: false })).toBeInTheDocument()
  })

  it('shows our own evenings among the rituals, linked to their page', async () => {
    renderAt('/calendar?month=1433-06')
    expect(await screen.findByRole('heading', { level: 2, name: /Ashwin 1433/ })).toBeInTheDocument()
    const evening = await screen.findByRole('heading', { level: 4, name: 'Cultural programme' })
    const item = evening.closest('li')!
    expect(item).toHaveTextContent('Our evening')
    expect(within(item).getByRole('link', { name: 'See the evening' })).toHaveAttribute('href', '/events/mahalaya-cultural-programme-2026')
  })

  it('goes month to month, keeping the month in the address', async () => {
    const { router } = renderAt('/calendar')
    const next = await screen.findByRole('link', { name: 'Next month, Agrahayan' })
    expect(next).toHaveTextContent('অগ্রহায়ণAgrahayan')
    expect(screen.getByRole('link', { name: 'Previous month, Ashwin' })).toHaveTextContent('আশ্বিনAshwin')
    await userEvent.click(next)
    expect(router.state.location.search).toBe('?month=1433-08')
    const heading = await screen.findByRole('heading', { level: 2, name: /Agrahayan 1433/ })
    expect(heading).toHaveFocus()
    await userEvent.click(screen.getByRole('link', { name: 'Back to this month' }))
    expect(await screen.findByRole('heading', { level: 2, name: /Kartik 1433/ })).toBeInTheDocument()
  })

  it('keeps the page where it is when the month changes, rather than jumping to the top', async () => {
    renderAt('/calendar')
    const next = await screen.findByRole('link', { name: 'Next month, Agrahayan' })
    vi.mocked(window.scrollTo).mockClear()
    await userEvent.click(next)
    expect(await screen.findByRole('heading', { level: 2, name: /Agrahayan 1433/ })).toBeInTheDocument()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('lands on an occasion in another month from Coming up, not on that month’s heading', async () => {
    // 16 October is Ashwin's last day but one; Lakshmi Puja is in Kartik.
    const { router } = renderAt('/calendar', api(), new Date('2026-10-16T09:00:00'))
    const today = await screen.findByRole('region', { name: 'Today' })
    await userEvent.click(within(today).getByRole('link', { name: 'Kojagari Lakshmi Puja' }))
    expect(router.state.location.search).toBe('?month=1433-07')
    const item = await screen.findByRole('heading', { level: 4, name: /Kojagari Lakshmi Puja/ })
    await waitFor(() => expect(item.closest('li')).toHaveFocus())
  })

  it('has 1434’s pujas too, with their times', async () => {
    renderAt('/calendar?month=1434-06')
    const puja = (await screen.findByRole('heading', { level: 4, name: /Durga Puja/ })).closest('li')!
    expect(puja).toHaveTextContent('Sandhi Puja')
    expect(puja).toHaveTextContent('UK Fri 8 Oct, 1:33 am – 2:21 amIndia Fri 8 Oct, 6:03 am – 6:51 am')
  })

  it('draws the days of a year whose panjika is not entered, and says so', async () => {
    renderAt('/calendar?month=1435-01')
    expect(await screen.findByRole('heading', { level: 2, name: /Boishakh 1435/ })).toBeInTheDocument()
    expect(screen.getByText(/The panjika for 1435 is not entered yet/)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('goes no further than the year after the last one entered', async () => {
    renderAt('/calendar?month=1435-12')
    expect(await screen.findByRole('heading', { level: 2, name: /Choitro 1435/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Next month/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Previous month/ })).toBeInTheDocument()
  })

  it('keeps the rituals when our own evenings cannot be fetched', async () => {
    renderAt('/calendar', api({ showCalendar: true }, createFailingApi()))
    expect(await screen.findByText(/We could not load our own evenings/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: /Durga Puja/ })).toBeInTheDocument()
  })

  it('lists the twelve months of the year', async () => {
    renderAt('/calendar')
    const year = await screen.findByRole('region', { name: /Year at a glance/ })
    expect(within(year).getAllByRole('listitem')).toHaveLength(12)
    expect(within(year).getByRole('link', { name: 'Kartik' })).toHaveAttribute('aria-current', 'true')
    expect(within(year).getByText('This month')).toBeInTheDocument()
  })

  it('passes the automated accessibility checks', async () => {
    const { container } = renderAt('/calendar')
    await screen.findByRole('heading', { level: 4, name: /Durga Puja/ })
    await expectNoAxeViolations(container)
  })
})

describe('the Benimadhab Sil panjika on the page', () => {
  afterEach(() => localStorage.clear())

  it('opens on Benimadhab Sil, and switches to the Bisuddha Siddhanta', async () => {
    renderAt('/calendar')
    const today = await screen.findByRole('region', { name: 'Today' })
    expect(screen.getByRole('radio', { name: /Benimadhab Sil/ })).toBeChecked()
    // Kartik begins a day later by the Surya Siddhanta: today is the 1st, not the 2nd.
    expect(within(today).getByText('আজ ১ কার্তিক ১৪৩৩')).toBeInTheDocument()
    expect(screen.getByText(/19 October – 17 November 2026 · 30 days/)).toBeInTheDocument()
    expect(screen.getByText(/Surya Siddhanta panjika printed by Benimadhab Sil/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /Bisuddha Siddhanta/ }))
    expect(within(today).getByText('আজ ২ কার্তিক ১৪৩৩')).toBeInTheDocument()
    expect(screen.getByText(/Dates follow the Bisuddha Siddhanta panjika for Kolkata/)).toBeInTheDocument()
  })

  it('moves a sankranti day with the almanac’s months, without a time it does not print', async () => {
    localStorage.setItem('calendar-panjika', 'surya')
    renderAt('/calendar?month=1433-07')
    const kartik = (await screen.findByRole('heading', { level: 4, name: /Kartik Puja/ })).closest('li')!
    expect(kartik).toHaveTextContent('Tue 17 Nov')
    expect(kartik).not.toHaveTextContent('Vrishchika sankranti')
  })

  it('gives Durga Puja its Benimadhab Sil days and times', async () => {
    localStorage.setItem('calendar-panjika', 'surya')
    renderAt('/calendar?month=1433-06')
    const puja = (await screen.findByRole('heading', { level: 4, name: /Durga Puja/ })).closest('li')!
    expect(puja).toHaveTextContent('Fri 16 – Wed 21 Oct')
    expect(puja).toHaveTextContent('Sat 17 Oct মহাসপ্তমী Maha Saptami')
    expect(puja).toHaveTextContent('India Mon 19 Oct, 7:25 am – 8:13 am')
    expect(screen.queryByText(/not yet checked it against a printed copy/)).not.toBeInTheDocument()
  })

  it('says when a month is only worked out, not yet read in the almanac', async () => {
    localStorage.setItem('calendar-panjika', 'surya')
    renderAt('/calendar?month=1434-12')
    expect(await screen.findByText(/We have worked out Choitro 1434 by the Benimadhab Sil almanac’s own rules.*one day earlier or later/)).toBeInTheDocument()
  })

  it('leaves out a puja not yet read in the almanac, and says so', async () => {
    localStorage.setItem('calendar-panjika', 'surya')
    renderAt('/calendar?month=1433-08')
    await screen.findByRole('heading', { level: 4, name: /Nabanna/ })
    expect(screen.queryByRole('heading', { level: 4, name: /Jagaddhatri Puja/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Not here yet in Benimadhab Sil dates: Jagaddhatri Puja and Rash Purnima\./)).toBeInTheDocument()
  })

  it('keeps focus on the switch when switching changes the month as well', async () => {
    // 18 October 2026 is 30 Ashwin by Benimadhab Sil and 1 Kartik by the Bisuddha Siddhanta.
    renderAt('/calendar', api(), new Date('2026-10-18T09:00:00'))
    expect(await screen.findByRole('heading', { level: 2, name: /Ashwin 1433/ })).toBeInTheDocument()
    const bisuddha = screen.getByRole('radio', { name: /Bisuddha Siddhanta/ })
    await userEvent.click(bisuddha)
    expect(await screen.findByRole('heading', { level: 2, name: /Kartik 1433/ })).toBeInTheDocument()
    expect(bisuddha).toHaveFocus()
  })

  it('still takes focus to the month heading on a real move after a switch', async () => {
    renderAt('/calendar')
    await userEvent.click(await screen.findByRole('radio', { name: /Bisuddha Siddhanta/ }))
    await userEvent.click(screen.getByRole('link', { name: /^Next month/ }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: /Agrahayan 1433/ })).toHaveFocus())
  })

  it('says under Coming up what Benimadhab Sil leaves out of it', async () => {
    localStorage.setItem('calendar-panjika', 'surya')
    // From 12 November it is Kartik Puja, Nabanna, then Poush Sankranti in January: Jagaddhatri and
    // Rash Purnima fall between, not read from the almanac yet.
    renderAt('/calendar', api(), new Date('2026-11-12T09:00:00'))
    const today = await screen.findByRole('region', { name: 'Today' })
    expect(within(today).getByText('Jagaddhatri Puja and Rash Purnima are not in Benimadhab Sil dates yet.')).toBeInTheDocument()
  })

  it('remembers the choice for the next visit', async () => {
    const first = renderAt('/calendar')
    await userEvent.click(await screen.findByRole('radio', { name: /Bisuddha Siddhanta/ }))
    first.unmount()
    renderAt('/calendar')
    expect(await screen.findByRole('radio', { name: /Bisuddha Siddhanta/ })).toBeChecked()
  })

  it('passes the automated accessibility checks', async () => {
    localStorage.setItem('calendar-panjika', 'surya')
    const { container } = renderAt('/calendar')
    await screen.findByRole('radio', { name: /Benimadhab Sil/ })
    await expectNoAxeViolations(container)
  })
})
