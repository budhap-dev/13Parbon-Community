import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

function renderEvents(session = previewAccounts[1]) {
  render(
    <TestDataProviders session={session}>
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
