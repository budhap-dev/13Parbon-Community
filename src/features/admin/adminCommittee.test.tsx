import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'
import { confirmRemove } from '@/test/confirm'

function renderAt(path: string, session = previewAccounts[1]) {
  render(
    <TestDataProviders session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

/** The committee's list, once what is saved has been read. */
const committee = async () => screen.findByRole('list', { name: 'The committee' })

/*
 * The committee as the About page names it, kept on People: who is on it is a question about
 * people, asked by somebody who has just come from the list of households.
 */
describe('the committee, on People', () => {
  it('is a tab of its own beside the households', async () => {
    renderAt('/admin/people')
    await userEvent.click(await screen.findByRole('tab', { name: 'Committee' }))
    expect(screen.getByRole('tab', { name: 'Committee' })).toHaveAttribute('aria-selected', 'true')
    const list = await committee()
    expect(within(list).getByLabelText('Role 1')).toHaveValue('Secretary')
    expect(within(list).getByLabelText('Name 1')).toHaveValue('Mr. Dalim Ghosh')
  })

  it('says the order is not a ranking, because somebody will wonder', async () => {
    renderAt('/admin/people?tab=committee')
    await committee()
    expect(screen.getByText(/which is not a ranking/)).toBeInTheDocument()
  })

  it('adds somebody and takes somebody off', async () => {
    renderAt('/admin/people?tab=committee')
    const list = await committee()
    const rows = () => within(list).getAllByLabelText(/^Role \d+$/).length

    const before = rows()
    await userEvent.click(screen.getByRole('button', { name: 'Add somebody' }))
    expect(rows()).toBe(before + 1)

    await userEvent.click(within(list).getByRole('button', { name: 'Remove Mr. Dalim Ghosh' }))
    await confirmRemove()
    expect(rows()).toBe(before)
  })

  it('moves somebody down the list, and up again', async () => {
    renderAt('/admin/people?tab=committee')
    const list = await committee()
    const second = (within(list).getByLabelText('Name 2') as HTMLInputElement).value

    await userEvent.click(within(list).getByRole('button', { name: 'Move Secretary down' }))
    expect(within(list).getByLabelText('Name 1')).toHaveValue(second)
    expect(within(list).getByLabelText('Name 2')).toHaveValue('Mr. Dalim Ghosh')
    // The first can go no higher.
    expect(within(list).getAllByRole('button', { name: /up$/ })[0]).toBeDisabled()
  })

  it('will not save a blank row, and saves a change', async () => {
    renderAt('/admin/people?tab=committee')
    const list = await committee()
    const save = screen.getByRole('button', { name: 'Save the committee' })

    await userEvent.click(screen.getByRole('button', { name: 'Add somebody' }))
    // A blank row is not a change, so there is still nothing to save.
    expect(save).toBeDisabled()

    await userEvent.clear(within(list).getByLabelText('Name 1'))
    await userEvent.type(within(list).getByLabelText('Name 1'), 'Mrs. Mitra')
    await userEvent.click(save)
    expect(await screen.findByText(/Saved. The About page changes/)).toBeInTheDocument()
  })

  it('takes an address from before the move to the committee’s new home', async () => {
    renderAt('/admin/pages?section=committee')
    expect(await screen.findByRole('tab', { name: 'Committee' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('adding a household', () => {
  it('opens over the list rather than in place of it', async () => {
    renderAt('/admin/people')
    await userEvent.click(await screen.findByRole('button', { name: 'Add a household' }))

    const dialog = await screen.findByRole('dialog', { name: 'Add a household' })
    expect(within(dialog).getByLabelText('Household name')).toHaveFocus()
    // The list is still there behind it.
    expect(screen.getByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
