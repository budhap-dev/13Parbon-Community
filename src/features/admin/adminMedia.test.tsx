import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

const admin = previewAccounts[1]
const member = previewAccounts[0]

function renderAt(path: string, session = admin) {
  render(
    <TestDataProviders session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
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
    expect(screen.getByText('Members only')).toBeInTheDocument()
  })

  it('says what the upload will take, before anybody tries', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    // Somebody dragging photographs off an iPhone is the likeliest person to be refused.
    expect(screen.getByText(/JPG, JPEG and PNG/)).toBeInTheDocument()
  })

  it('says the metadata never leaves the machine, which is the whole promise', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    expect(screen.getByText(/never\s+leave your computer/)).toBeInTheDocument()
  })

  it('makes a new album', async () => {
    renderAt('/admin/media')
    await userEvent.click(await screen.findByRole('button', { name: 'New album' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Holi 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Make the album' }))

    expect(await screen.findByText('Holi 2027')).toBeInTheDocument()
  })

  it('refuses one with no name and stays on the form', async () => {
    renderAt('/admin/media')
    await userEvent.click(await screen.findByRole('button', { name: 'New album' }))
    await userEvent.click(screen.getByRole('button', { name: 'Make the album' }))

    expect(await screen.findByText(/needs a name/i)).toBeInTheDocument()
  })

  it('offers members-only as the way to hide a picture without destroying it', async () => {
    renderAt('/admin/media')
    await userEvent.click(await screen.findByRole('button', { name: 'New album' }))
    expect(screen.getByText(/without destroying it/)).toBeInTheDocument()
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

    const before = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.getAttribute('aria-label'))
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
      const after = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.getAttribute('aria-label'))
      expect(after[2]).toBe(before[0])
    })
    // The drag is over: neither mark should be left behind on any card.
    expect(document.querySelector('.dragging, .over')).toBeNull()
  })

  it('reorders from the keyboard too, because dragging cannot be done without a mouse', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const before = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.getAttribute('aria-label'))
    screen.getAllByRole('button', { name: /^Open / })[0].focus()
    await userEvent.keyboard('{ArrowRight}')

    await waitFor(() => {
      const after = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.getAttribute('aria-label'))
      expect(after[1]).toBe(before[0])
    })
  })

  it('will not carry the first one further left, or the last one further right', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const before = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.getAttribute('aria-label'))
    screen.getAllByRole('button', { name: /^Open / })[0].focus()
    await userEvent.keyboard('{ArrowLeft}')

    const after = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.getAttribute('aria-label'))
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
    const confirm = screen.getByRole('alert')
    // The address stopping working is the point, and it is what the privacy page promises.
    expect(within(confirm).getByText(/goes from the bucket/)).toBeInTheDocument()
    expect(within(confirm).getByText(/cannot be undone/)).toBeInTheDocument()
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
  })
})

describe('opening a photograph', () => {
  it('shows it large when the picture is clicked', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    await userEvent.click(screen.getAllByRole('button', { name: /^Open / })[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('moves through the album from there', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    await userEvent.click(screen.getAllByRole('button', { name: /^Open / })[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /previous/i })).toBeInTheDocument()
  })

  it('deletes from the viewer, once it has asked', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    const before = screen.getAllByRole('button', { name: /^Open / }).length

    await userEvent.click(screen.getAllByRole('button', { name: /^Open / })[0])
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /Delete this photograph/ }))

    // A full-screen picture makes one tap feel safer than it is, so it asks here too.
    expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: /^Delete$/ }))

    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(before - 1))
  })
})
