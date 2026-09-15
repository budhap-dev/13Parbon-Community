import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders, TEST_NOW } from '@/test/render'
import { createMockApi } from '@/lib/api'
import { testEvents } from '@/test/events'

/**
 * An evening that has happened and that nobody has filed yet.
 *
 * Every past event in the fixtures is already marked past, which is the tidy state and so has
 * no Archive button. This is the untidy one the button exists for: the night was last week and
 * the committee has been busy.
 */
const unfiled = {
  ...testEvents[0],
  id: 'ev-last-week',
  slug: 'last-week',
  title: 'The evening nobody filed',
  startsAt: '2026-08-20T18:00:00',
  endsAt: '2026-08-20T22:00:00',
  status: 'published' as const,
}

function renderEvents(session = previewAccounts[1], events = testEvents) {
  render(
    <TestDataProviders session={session} api={createMockApi({ now: () => TEST_NOW, events })}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/events'] })} />
    </TestDataProviders>,
  )
}

async function design() {
  await userEvent.click((await screen.findAllByRole('button', { name: /^Design / }))[0])
  return screen.findByRole('complementary', { name: 'How it will look' })
}

describe('getting into the designer', () => {
  it('opens from any event in the list, drafts included', async () => {
    renderEvents()
    const buttons = await screen.findAllByRole('button', { name: /^Design / })
    expect(buttons.length).toBeGreaterThan(1)
  })

  it('says the planner still holds the logistics', async () => {
    renderEvents()
    await design()
    expect(screen.getByText(/The planner still\s+holds the logistics/)).toBeInTheDocument()
  })
})

describe('adding an evening', () => {
  it('opens a blank designer from the events page', async () => {
    renderEvents()
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Add an event' })).toBeInTheDocument()
    expect(screen.getByLabelText('What it is called')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Add the event' })).toBeInTheDocument()
  })

  it('says a new evening is saved as a draft whatever the form says', async () => {
    renderEvents()
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))
    // Nothing should reach the website because somebody opened a form and was called away.
    expect(screen.getByText(/saved as a draft whatever you choose/)).toBeInTheDocument()
  })

  it('adds one, and it arrives in the list as a draft', async () => {
    renderEvents()
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))

    await userEvent.type(screen.getByLabelText('What it is called'), 'Holi 2027')
    await userEvent.type(screen.getByLabelText('One line about it'), 'Colours in the park, and a late lunch.')
    await userEvent.type(screen.getByLabelText('Starts'), '2027-03-12T11:00')
    await userEvent.type(screen.getByLabelText('Venue'), 'Morley Park')
    // Chosen as published, and it should still arrive as a draft.
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'published')
    await userEvent.click(screen.getByRole('button', { name: 'Add the event' }))

    const row = await screen.findByRole('row', { name: /Holi 2027/ })
    expect(within(row).getByText('Draft')).toBeInTheDocument()
  })

  it('will not add one with nothing in it', async () => {
    renderEvents()
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add the event' }))

    expect(screen.getByText(/Give the evening a name/)).toBeInTheDocument()
  })
})

describe('an event the public can already see', () => {
  it('says so before anything is changed', async () => {
    renderEvents()
    const rows = await screen.findAllByRole('row', { name: /Published/ })
    await userEvent.click(within(rows[0]).getByRole('button', { name: /^Design / }))

    expect(await screen.findByText(/This event is on the website/)).toBeInTheDocument()
    expect(screen.getByText(/changes what\s+visitors see straight away/)).toBeInTheDocument()
  })

  it('does not say it about a draft', async () => {
    renderEvents()
    const rows = await screen.findAllByRole('row', { name: /Draft/ })
    await userEvent.click(within(rows[0]).getByRole('button', { name: /^Design / }))

    await screen.findByLabelText('What it is called')
    expect(screen.queryByText(/This event is on the website/)).not.toBeInTheDocument()
  })
})

describe('archiving', () => {
  it('is offered only for an evening that has been and gone', async () => {
    renderEvents(previewAccounts[1], [...testEvents, unfiled])
    await screen.findAllByRole('button', { name: /^Design / })

    const archives = screen.queryAllByRole('button', { name: /^Archive / })
    const designs = screen.getAllByRole('button', { name: /^Design / })
    // Some events, not all of them: a date in the future is not something to file away.
    expect(archives.length).toBeGreaterThan(0)
    expect(archives.length).toBeLessThan(designs.length)
  })

  it('files it as past', async () => {
    renderEvents(previewAccounts[1], [...testEvents, unfiled])
    const archive = (await screen.findAllByRole('button', { name: /^Archive / }))[0]
    const name = archive.getAttribute('aria-label')!.replace('Archive ', '')

    await userEvent.click(archive)

    await waitFor(() => {
      const row = screen.getByRole('row', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      expect(within(row).getByText('Past')).toBeInTheDocument()
    })
  })

  it('is not offered twice for the same evening', async () => {
    renderEvents(previewAccounts[1], [...testEvents, unfiled])
    const before = (await screen.findAllByRole('button', { name: /^Archive / })).length
    await userEvent.click((await screen.findAllByRole('button', { name: /^Archive / }))[0])

    await waitFor(() => expect(screen.queryAllByRole('button', { name: /^Archive / })).toHaveLength(before - 1))
  })
})

describe('the preview', () => {
  it('follows the title as it is typed', async () => {
    renderEvents()
    const preview = await design()

    const title = screen.getByLabelText('What it is called')
    await userEvent.clear(title)
    await userEvent.type(title, 'Boishakhi 2027')

    expect(within(preview).getByRole('heading', { name: 'Boishakhi 2027' })).toBeInTheDocument()
  })

  it('shows the theme in Bengali with the English beside it', async () => {
    renderEvents()
    const preview = await design()

    await userEvent.type(screen.getByLabelText('In Bengali'), 'সেকাল')
    await userEvent.type(screen.getByLabelText('In English'), 'Then and now')

    expect(within(preview).getByText(/সেকাল/)).toBeInTheDocument()
    expect(within(preview).getByText(/Then and now/)).toBeInTheDocument()
  })

  it('says why there is no booking button, rather than just not drawing one', async () => {
    renderEvents()
    const preview = await design()

    const open = screen.getByLabelText('Booking is open')
    if ((open as HTMLInputElement).checked) await userEvent.click(open)

    expect(within(preview).getByText(/booking is closed/)).toBeInTheDocument()
  })

  it('says when the cover is missing instead of showing a gap', async () => {
    renderEvents()
    const preview = await design()
    const cover = screen.getByLabelText('Cover photograph')
    await userEvent.clear(cover)
    expect(within(preview).getByText(/No cover photograph yet/)).toBeInTheDocument()
  })
})

describe('the programme', () => {
  it('adds and removes a line', async () => {
    renderEvents()
    await design()

    await userEvent.click(screen.getByRole('button', { name: 'Add to the programme' }))
    await userEvent.type(screen.getByLabelText('What happens at item 1'), 'Children’s dance')

    expect(screen.getByLabelText('What happens at item 1')).toHaveValue('Children’s dance')
    await userEvent.click(screen.getByRole('button', { name: 'Remove item 1' }))
    expect(screen.queryByLabelText('What happens at item 1')).not.toBeInTheDocument()
  })

  it('puts the running order in time order in the preview', async () => {
    renderEvents()
    const preview = await design()

    await userEvent.click(screen.getByRole('button', { name: 'Add to the programme' }))
    await userEvent.type(screen.getByLabelText('Time for item 1'), '20:00')
    await userEvent.type(screen.getByLabelText('What happens at item 1'), 'Dinner')

    await userEvent.click(screen.getByRole('button', { name: 'Add to the programme' }))
    await userEvent.type(screen.getByLabelText('Time for item 2'), '18:30')
    await userEvent.type(screen.getByLabelText('What happens at item 2'), 'Doors')

    const lines = within(preview).getAllByRole('listitem').map((li) => li.textContent)
    expect(lines[0]).toMatch(/Doors/)
    expect(lines[1]).toMatch(/Dinner/)
  })
})

describe('refusing to save something broken', () => {
  it('will not take a booking link that is not a web address', async () => {
    renderEvents()
    await design()

    const url = screen.getByLabelText('Booking form')
    await userEvent.clear(url)
    await userEvent.type(url, 'ask Rina')
    await userEvent.click(screen.getByRole('button', { name: 'Save the event' }))

    // A broken button is worse than none: it still looks like it works.
    expect(screen.getByText(/does not look like a web address/)).toBeInTheDocument()
  })

  it('will not let an evening finish before it starts', async () => {
    renderEvents()
    await design()

    await userEvent.clear(screen.getByLabelText('Ends'))
    await userEvent.type(screen.getByLabelText('Ends'), '2020-01-01T10:00')
    await userEvent.click(screen.getByRole('button', { name: 'Save the event' }))

    expect(screen.getByText(/cannot finish before it starts/)).toBeInTheDocument()
  })

  it('saves and comes back to the list', async () => {
    renderEvents()
    await design()

    const title = screen.getByLabelText('What it is called')
    await userEvent.clear(title)
    await userEvent.type(title, 'A renamed evening')
    await userEvent.click(screen.getByRole('button', { name: 'Save the event' }))

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument())
    // It appears in the all-events table and in the attendance picker, so count rather than
    // expect exactly one.
    expect((await screen.findAllByText('A renamed evening')).length).toBeGreaterThan(0)
  })
})
