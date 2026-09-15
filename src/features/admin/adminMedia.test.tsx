import { render, screen, waitFor, within } from '@testing-library/react'
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
  it('says the cover rotates until one is pinned', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    expect(screen.getByText(/different one each visit/)).toBeInTheDocument()
  })

  it('pins a cover, and then says so', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const [first] = screen.getAllByRole('button', { name: 'Make it the face' })
    await userEvent.click(first)

    expect(await screen.findByRole('button', { name: 'Album’s face' })).toBeDisabled()
    expect(screen.getByText(/One is pinned/)).toBeInTheDocument()
  })

  it('writes a caption when the box is left', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const [caption] = screen.getAllByLabelText('Caption')
    await userEvent.type(caption, 'The lamps going up')
    await userEvent.tab()

    await waitFor(() => expect(screen.getAllByLabelText('Caption')[0]).toHaveValue('The lamps going up'))
  })

  it('will not move the first one earlier, or the last one later', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    const earlier = screen.getAllByRole('button', { name: /Move .* earlier/ })
    const later = screen.getAllByRole('button', { name: /Move .* later/ })
    expect(earlier[0]).toBeDisabled()
    expect(later[later.length - 1]).toBeDisabled()
  })

  it('asks before taking a photograph down, and says it cannot be undone', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)

    await userEvent.click(screen.getAllByRole('button', { name: 'Take down' })[0])
    const confirm = screen.getByRole('alert')
    // The address stopping working is the point, and it is what the privacy page promises.
    expect(within(confirm).getByText(/removed from the bucket/)).toBeInTheDocument()
    expect(within(confirm).getByText(/cannot be undone/)).toBeInTheDocument()
  })

  it('backs out of taking one down', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    const before = screen.getAllByRole('button', { name: 'Take down' }).length

    await userEvent.click(screen.getAllByRole('button', { name: 'Take down' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))

    expect(screen.getAllByRole('button', { name: 'Take down' })).toHaveLength(before)
  })

  it('takes one down for good', async () => {
    renderAt('/admin/media')
    await openAlbum(/Boishakhi 2026/)
    const before = screen.getAllByRole('button', { name: 'Take down' }).length

    await userEvent.click(screen.getAllByRole('button', { name: 'Take down' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Take it down' }))

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Take down' })).toHaveLength(before - 1))
  })
})
