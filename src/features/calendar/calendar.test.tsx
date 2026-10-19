import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
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
  it('is off to begin with: no link, and the page is not there', async () => {
    expect(defaultSettings.showCalendar).toBe(false)
    expect(publicNav(defaultSettings).map((item) => item.to)).not.toContain('/calendar')
    renderAt('/calendar', api({}))
    expect(await screen.findByRole('heading', { level: 1, name: /not found|cannot find|nothing here/i })).toBeInTheDocument()
  })

  it('puts Calendar after Events in the header once it is on', () => {
    const nav = publicNav({ ...defaultSettings, showCalendar: true }).map((item) => item.label)
    expect(nav.indexOf('Calendar')).toBe(nav.indexOf('Events') + 1)
  })
})

describe('the calendar page', () => {
  it('opens on the Bengali month it is today, and says what today is', async () => {
    renderAt('/calendar')
    expect(await screen.findByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /কার্তিক ১৪৩৩ Kartik 1433/ })).toBeInTheDocument()
    const today = screen.getByRole('region', { name: 'Today' })
    expect(within(today).getByText('আজ ২ কার্তিক ১৪৩৩')).toBeInTheDocument()
    expect(within(today).getByText('Monday 19 October 2026')).toBeInTheDocument()
    expect(within(today).getByText(/Maha Ashtami: Durga Puja/)).toBeInTheDocument()
  })

  it('gives today’s times in UK time with Kolkata’s beside them, and only today’s', async () => {
    renderAt('/calendar')
    const today = await screen.findByRole('region', { name: 'Today' })
    const sandhi = within(today).getByText('Sandhi Puja').closest('div')!
    // 10:27 in Kolkata is 5:57 in the morning here, in British Summer Time.
    expect(sandhi).toHaveTextContent('Mon 19 Oct, 5:57 am – 6:45 am UK time · Mon 19 Oct, 10:27 am – 11:15 am in Kolkata')
    expect(within(today).getByText('Navami tithi')).toBeInTheDocument()
    expect(within(today).queryByText('Shashthi tithi')).not.toBeInTheDocument()
  })

  it('shows a sankranti as a moment, with no end', async () => {
    renderAt('/calendar?month=1433-07')
    const kartik = (await screen.findByRole('heading', { level: 4, name: /Kartik Puja/ })).closest('li')!
    expect(kartik).toHaveTextContent('Vrishchika sankrantiMon 16 Nov, 2:18 pm UK time · Mon 16 Nov, 7:48 pm in Kolkata')
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

  it('draws the days of a year whose panjika is not entered, and says so', async () => {
    renderAt('/calendar?month=1434-01')
    expect(await screen.findByRole('heading', { level: 2, name: /Boishakh 1434/ })).toBeInTheDocument()
    expect(screen.getByText(/The panjika for 1434 is not entered yet/)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('goes no further than the year after the last one entered', async () => {
    renderAt('/calendar?month=1434-12')
    expect(await screen.findByRole('heading', { level: 2, name: /Choitro 1434/ })).toBeInTheDocument()
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
