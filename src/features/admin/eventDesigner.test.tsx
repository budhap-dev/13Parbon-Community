import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
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

/** jsdom has no canvas, so the preparing is stubbed where the real thing needs one. */
function stubPrepare() {
  const clean = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x41, 0x41, 0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xd9])
  vi.stubGlobal('createImageBitmap', async () => ({ width: 4000, height: 3000, close: vi.fn() }))
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as never
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
    cb(new Blob([clean], { type: 'image/jpeg' }))
  } as never
  Blob.prototype.arrayBuffer = async function () {
    return clean.buffer.slice(0) as ArrayBuffer
  }
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
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

  it('offers a few quiet ways for the cover to move, still first', async () => {
    renderEvents()
    await design()

    const picker = screen.getByLabelText('How it moves')
    expect(within(picker).getByRole('option', { name: 'Still' })).toBeInTheDocument()
    expect(within(picker).getByRole('option', { name: 'Slow zoom' })).toBeInTheDocument()
    expect(within(picker).getAllByRole('option').length).toBeLessThanOrEqual(6)
  })

  it('says what the chosen movement does, and changes as the choice does', async () => {
    renderEvents()
    await design()

    await userEvent.selectOptions(screen.getByLabelText('How it moves'), 'drift')
    expect(screen.getByText(/Suits a wide photograph/)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('How it moves'), 'colour')
    expect(screen.getByText(/Starts black and white/)).toBeInTheDocument()
  })

  it('promises that somebody asking for less movement gets none', async () => {
    renderEvents()
    await design()
    expect(screen.getByText(/asked their machine for less movement/)).toBeInTheDocument()
  })

  it('shows the movement in the preview rather than describing it', async () => {
    renderEvents()
    const preview = await design()

    const cover = screen.getByLabelText('Cover photograph')
    await userEvent.clear(cover)
    await userEvent.type(cover, 'https://photos.13parbon.org.uk/full/x.jpg')
    await userEvent.selectOptions(screen.getByLabelText('How it moves'), 'zoom')

    // A preview that flattered would be worse than none, so it draws the real component.
    const img = preview.querySelector('img')!
    expect(img.className.split(' ')).toHaveLength(2)
  })

  it('shows a chosen photograph before it has been anywhere', async () => {
    stubPrepare()
    renderEvents()
    const preview = await design()

    await userEvent.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      new File([new Uint8Array([1, 2, 3])], 'boishakhi.jpg', { type: 'image/jpeg' }),
    )

    /*
     * The address field is still empty — nothing has been sent. Showing the picture-shaped hole
     * anyway is what made somebody think choosing a file had not worked.
     */
    expect(screen.getByLabelText('Cover photograph')).toHaveValue('')
    await waitFor(() => expect(preview.querySelector('img')).toHaveAttribute('src', 'blob:preview'))
  })

  it('says a chosen photograph is not saved until it is in the bucket', async () => {
    stubPrepare()
    renderEvents()
    const preview = await design()

    await userEvent.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      new File([new Uint8Array([1, 2, 3])], 'boishakhi.jpg', { type: 'image/jpeg' }),
    )

    // A preview that flatters is worse than none: the event would save without a cover.
    expect(await within(preview).findByText(/only on this machine so far/)).toBeInTheDocument()
  })

  it('says when the cover is missing instead of showing a gap', async () => {
    renderEvents()
    const preview = await design()
    const cover = screen.getByLabelText('Cover photograph')
    await userEvent.clear(cover)
    expect(within(preview).getByText(/No cover photograph yet/)).toBeInTheDocument()
  })
})

describe('seeing it at both widths', () => {
  it('offers a desktop and a phone, with desktop chosen', async () => {
    renderEvents()
    const preview = await design()
    const group = within(preview).getByRole('group', { name: 'Preview width' })

    expect(within(group).getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: 'Phone' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches to the phone and stays there', async () => {
    renderEvents()
    const preview = await design()

    await userEvent.click(within(preview).getByRole('button', { name: 'Phone' }))
    expect(within(preview).getByRole('button', { name: 'Phone' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows the same evening either way, so the two cannot disagree', async () => {
    renderEvents()
    const preview = await design()

    const title = screen.getByLabelText('What it is called')
    await userEvent.clear(title)
    await userEvent.type(title, 'Holi 2027')
    expect(within(preview).getByRole('heading', { name: 'Holi 2027' })).toBeInTheDocument()

    await userEvent.click(within(preview).getByRole('button', { name: 'Phone' }))
    expect(within(preview).getByRole('heading', { name: 'Holi 2027' })).toBeInTheDocument()
  })

  it('gives the cover a taller crop on a phone, as the page does', async () => {
    renderEvents()
    const preview = await design()
    const frame = () => preview.querySelector('[style*="aspect-ratio"]') as HTMLElement

    expect(frame().style.aspectRatio).toBe('16 / 9')
    await userEvent.click(within(preview).getByRole('button', { name: 'Phone' }))
    expect(frame().style.aspectRatio).toBe('4 / 3')
  })
})

describe('a preview with nothing in it yet', () => {
  it('shows the shape rather than a column of blanks', async () => {
    renderEvents()
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))
    const preview = await screen.findByRole('complementary', { name: 'How it will look' })

    // Five greyed "No …" lines read as something that failed to load, not as a preview.
    expect(within(preview).getByRole('heading', { name: 'Boishakhi 2027' })).toBeInTheDocument()
    expect(within(preview).getByText(/St Andrew’s Community Hall/)).toBeInTheDocument()
  })

  it('says the faded parts are a stand-in and will not be saved', async () => {
    renderEvents()
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))
    const preview = await screen.findByRole('complementary', { name: 'How it will look' })
    // Cheaper than somebody publishing an evening called Boishakhi 2027 they never typed.
    expect(within(preview).getByText(/It is not saved/)).toBeInTheDocument()
  })

  it('drops the stand-in the moment something real is typed', async () => {
    renderEvents()
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))
    const preview = await screen.findByRole('complementary', { name: 'How it will look' })

    await userEvent.type(screen.getByLabelText('What it is called'), 'Holi 2027')
    expect(within(preview).queryByRole('heading', { name: 'Boishakhi 2027' })).not.toBeInTheDocument()
    expect(within(preview).getByRole('heading', { name: 'Holi 2027' })).toBeInTheDocument()
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
