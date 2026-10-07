import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { createTestApi, TestDataProviders } from '@/test/render'

const admin = previewAccounts[1]

/** The photographs' own buttons. Inside the page, so the portal's "Open menu" is not one of them. */
const photos = () => within(screen.getByRole('main')).getAllByRole('button', { name: /^Open / })
const member = previewAccounts[0]

function renderAt(path: string, session = admin) {
  render(
    <TestDataProviders session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

function renderWith(api: ReturnType<typeof createTestApi>) {
  render(
    <TestDataProviders session={admin} api={api}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/media'] })} />
    </TestDataProviders>,
  )
}

async function openAlbum(name: RegExp) {
  await userEvent.click(await screen.findByRole('button', { name }))
  return screen.findByRole('heading', { level: 1 })
}

describe('who gets in', () => {
  it('keeps a member out of the photographs screen', async () => {
    renderAt('/admin/media', member)
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Photographs' })).not.toBeInTheDocument())
  })
})

describe('the albums', () => {
  it('shows the committee the unpublished ones too, and says which is which', async () => {
    renderAt('/admin/media')
    expect(await screen.findByText('Boishakhi 2026')).toBeInTheDocument()
    // The members-only album is not on the public gallery, and is here.
    expect(screen.getByText('Committee dinner')).toBeInTheDocument()
    expect(screen.getAllByText('On the website').length).toBeGreaterThan(0)
    expect(screen.getByText('Not published yet')).toBeInTheDocument()
  })

  it('says what the upload will take, before anybody tries', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    // Somebody dragging photographs off an iPhone is the likeliest person to be refused. Said
    // twice on purpose now: once in the note above, and once on the control itself, where
    // somebody who skipped the paragraph is about to choose a file.
    expect(screen.getAllByText(/JPG, JPEG and PNG/).length).toBeGreaterThan(0)
  })

  it('offers a way to add them to the album, more than one at a time', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    // The committee could make albums and never fill them: there was nowhere to put a picture,
    // and no way to say a picture was in one. What the control does once a file is chosen —
    // including saying there is no bucket — is PhotoUpload's own test.
    expect(screen.getByRole('button', { name: 'Add photographs' })).toBeInTheDocument()
    // An evening arrives as a folder, not as one picture twenty times over.
    expect(document.querySelector('input[type="file"]')).toHaveAttribute('multiple')
  })

  it('says the metadata never leaves the machine, which is the whole promise', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    expect(screen.getByText(/never\s+leave your computer/)).toBeInTheDocument()
  })

  it('makes a new album, kept off the website until it is published', async () => {
    renderAt('/admin/media')
    await userEvent.click(await screen.findByRole('button', { name: 'New album' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Holi 2027')
    expect(screen.getByLabelText('Published')).toHaveValue('members')
    await userEvent.click(screen.getByRole('button', { name: 'Make the album' }))

    expect(await screen.findByText('Holi 2027')).toBeInTheDocument()
    expect(screen.getAllByText('Not published yet')).toHaveLength(2)
  })

  it('refuses one with no name and stays on the form', async () => {
    renderAt('/admin/media')
    await userEvent.click(await screen.findByRole('button', { name: 'New album' }))
    await userEvent.click(screen.getByRole('button', { name: 'Make the album' }))

    expect(await screen.findByText(/needs a name/i)).toBeInTheDocument()
  })

  it('says how an album goes on the website once its photographs are checked', async () => {
    renderAt('/admin/media')
    await userEvent.click(await screen.findByRole('button', { name: 'New album' }))
    expect(screen.getByText(/choose Yes to put the\s+album on the website/)).toBeInTheDocument()
  })
})

describe('inside an album', () => {
  it('writes a caption when the box is left', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const [caption] = screen.getAllByLabelText('Caption')
    await userEvent.type(caption, 'The lamps going up')
    await userEvent.tab()

    await waitFor(() => expect(screen.getAllByLabelText('Caption')[0]).toHaveValue('The lamps going up'))
  })

  it('reorders by dragging one photograph onto another', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const before = photos().map((b) => b.getAttribute('aria-label'))
    const cards = document.querySelectorAll('li[draggable="true"]')
    expect(cards.length).toBeGreaterThan(2)

    /*
     * jsdom does not put a `dataTransfer` on a synthetic drag event, and a real browser always
     * does. Without this stub both handlers threw on their first line — the test still passed,
     * because the one state change it asserted happened before the throw, and the drop-target
     * highlight it never looked at was silently dead.
     */
    const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn(), getData: vi.fn() }

    fireEvent.dragStart(cards[0], { dataTransfer })
    expect(cards[0].className).toContain('dragging')
    expect(dataTransfer.setData).toHaveBeenCalled()

    fireEvent.dragOver(cards[2], { dataTransfer })
    expect(cards[2].className).toContain('over')

    fireEvent.drop(cards[2], { dataTransfer })

    await waitFor(() => {
      const after = photos().map((b) => b.getAttribute('aria-label'))
      expect(after[2]).toBe(before[0])
    })
    // The drag is over: neither mark should be left behind on any card.
    expect(document.querySelector('.dragging, .over')).toBeNull()
  })

  it('reorders from the keyboard too, because dragging cannot be done without a mouse', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const before = photos().map((b) => b.getAttribute('aria-label'))
    photos()[0].focus()
    await userEvent.keyboard('{ArrowRight}')

    await waitFor(() => {
      const after = photos().map((b) => b.getAttribute('aria-label'))
      expect(after[1]).toBe(before[0])
    })
  })

  it('will not carry the first one further left, or the last one further right', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const before = photos().map((b) => b.getAttribute('aria-label'))
    photos()[0].focus()
    await userEvent.keyboard('{ArrowLeft}')

    const after = photos().map((b) => b.getAttribute('aria-label'))
    expect(after).toEqual(before)
  })

  it('puts the delete on the picture itself', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    // The control sits where the thing it acts on is, rather than in a row of lookalike buttons.
    const [frame] = document.querySelectorAll('li[draggable="true"] > div')
    expect(within(frame as HTMLElement).getByRole('button', { name: /^Delete / })).toBeInTheDocument()
    expect(within(frame as HTMLElement).getByRole('button', { name: /^Open / })).toBeInTheDocument()
  })

  it('asks before deleting, and says what it means', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    await userEvent.click(screen.getAllByRole('button', { name: /^Delete / })[0])
    const confirm = await screen.findByRole('dialog')
    expect(confirm).toHaveAccessibleName('Delete this photograph?')
    // The address stopping working is the point, and it is what the privacy page promises.
    expect(confirm).toHaveTextContent(/deleted from storage first/)
    expect(confirm).toHaveTextContent(/cannot be undone/)
    // Focus lands on the way out, not on the way through.
    expect(within(confirm).getByRole('button', { name: 'Keep it' })).toHaveFocus()
  })

  it('backs out of deleting', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    const before = screen.getAllByRole('button', { name: /^Delete / }).length

    await userEvent.click(screen.getAllByRole('button', { name: /^Delete / })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))

    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(before)
  })

  it('deletes for good', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    const before = screen.getAllByRole('button', { name: /^Delete / }).length

    await userEvent.click(screen.getAllByRole('button', { name: /^Delete / })[0])
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(before - 1))
    // Gone from the grid is not the same as gone from the bucket, so it says which happened.
    expect(await screen.findByText(/Taken down\./)).toBeInTheDocument()
    expect(screen.getByText(/address stops working/)).toBeInTheDocument()
  })

  /*
   * The one that had no path at all. The button disabled itself, the request went, and when the
   * bucket refused, the dialog sat there with the button live again and nothing said why — on
   * the single action the privacy page makes a promise about, where a silent failure reads
   * exactly like success.
   */
  it('says so when the bucket will not let go of it', async () => {
    const api = createTestApi()
    const failing = {
      ...api,
      gallery: {
        ...api.gallery,
        deleteMedia: async () => {
          throw new Error('The upload was refused (403).')
        },
      },
    }
    render(
      <TestDataProviders session={admin} api={failing}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/media'] })} />
      </TestDataProviders>,
    )
    await openAlbum(/Boishakhi 2026/)
    const before = screen.getAllByRole('button', { name: /^Delete / }).length

    await userEvent.click(screen.getAllByRole('button', { name: /^Delete / })[0])
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

    // Said in the question that is still open: behind the modal, nobody would see it.
    const asking = screen.getByRole('dialog')
    expect(await within(asking).findByRole('alert')).toHaveTextContent(/has not been taken down/)
    expect(within(asking).getByRole('alert')).toHaveTextContent(/upload was refused/)
    // And the photograph is still there, because it is.
    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(before)

    // Backing out takes the failure with it, so the next question starts clean.
    await userEvent.click(within(asking).getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByText(/has not been taken down/)).not.toBeInTheDocument()
  })

  it('says so in the viewer when a delete from there fails', async () => {
    const api = createTestApi()
    renderWith({
      ...api,
      gallery: { ...api.gallery, deleteMedia: async () => { throw new Error('The upload was refused (403).') } },
    })
    await openAlbum(/Boishakhi 2026/)
    await userEvent.click(photos()[0])
    const viewer = await screen.findByRole('dialog')
    await userEvent.click(within(viewer).getByRole('button', { name: /Delete this photograph/ }))
    await userEvent.click(within(viewer).getByRole('button', { name: /^Delete$/ }))

    expect(await within(viewer).findByRole('alert')).toHaveTextContent(/has not been taken down/)
  })

  it('says under the box when a caption did not save', async () => {
    const api = createTestApi()
    renderWith({
      ...api,
      gallery: { ...api.gallery, setCaption: async () => { throw new Error('The server did not answer.') } },
    })
    await openAlbum(/Boishakhi 2026/)

    const [caption] = screen.getAllByLabelText('Caption')
    await userEvent.type(caption, 'The lamps going up')
    await userEvent.tab()

    const card = caption.closest('li')!
    expect(await within(card).findByRole('alert')).toHaveTextContent('That caption did not save. The server did not answer.')
    // Only that one: the other photographs' boxes say nothing.
    expect(screen.getAllByText(/That caption did not save/)).toHaveLength(1)
  })

  it('says a caption saved', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    const [caption] = screen.getAllByLabelText('Caption')
    await userEvent.type(caption, 'The lamps going up')
    await userEvent.tab()
    expect(await within(caption.closest('li')!).findByRole('status')).toHaveTextContent('Saved.')
  })

  it('says a new order was not saved, and leaves the photographs where they were', async () => {
    const api = createTestApi()
    renderWith({
      ...api,
      gallery: { ...api.gallery, reorder: async () => { throw new Error('The server did not answer.') } },
    })
    await openAlbum(/Boishakhi 2026/)
    const before = photos().map((b) => b.getAttribute('aria-label'))
    photos()[0].focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(await screen.findByText(/The new order was not saved/)).toHaveAttribute('role', 'alert')
    expect(photos().map((b) => b.getAttribute('aria-label'))).toEqual(before)
  })
})

describe('saying an album saved', () => {
  it('says so once the details of an album are saved', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    await userEvent.click(screen.getByRole('button', { name: 'Edit album' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save the album' }))
    expect(await screen.findByText('The album is saved.')).toHaveAttribute('role', 'status')
  })

  it('says so once a new album is made', async () => {
    renderAt('/admin/media')
    await userEvent.click(await screen.findByRole('button', { name: 'New album' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Holi 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Make the album' }))
    expect(await screen.findByText(/Holi 2027 is made/)).toHaveAttribute('role', 'status')
  })
})

describe('opening a photograph', () => {
  it('shows it large when the picture is clicked', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    await userEvent.click(photos()[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('moves through the album from there', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    await userEvent.click(photos()[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /previous/i })).toBeInTheDocument()
  })

  it('deletes from the viewer, once it has asked', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    const before = photos().length

    await userEvent.click(photos()[0])
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /Delete this photograph/ }))

    // A full-screen picture makes one tap feel safer than it is, so it asks here too.
    expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: /^Delete$/ }))

    await waitFor(() => expect(photos()).toHaveLength(before - 1))
  })
})
