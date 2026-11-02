import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

const admin = previewAccounts[1]

async function renderEvents() {
  render(
    <TestDataProviders session={admin}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/events'] })} />
    </TestDataProviders>,
  )
  return within(await screen.findByRole('table'))
}

/**
 * Deleting an evening, for one that should never have been there.
 *
 * It asks first, says what goes and what to do instead, and is refused — in the database's own
 * words — where a headcount or an album still hangs on the evening.
 */
describe('deleting an event', () => {
  it('asks first, and keeping it changes nothing', async () => {
    const table = await renderEvents()
    await userEvent.click(await table.findByRole('button', { name: 'Delete Picnic (draft)' }))
    const asking = screen.getByRole('dialog', { name: 'Delete this event?' })
    expect(asking).toHaveTextContent(/Picnic \(draft\).*goes for good/)
    expect(asking).toHaveTextContent(/set it to Draft in Design instead/)

    await userEvent.click(within(asking).getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(table.getByRole('row', { name: /Picnic \(draft\)/ })).toBeInTheDocument()
  })

  it('takes it out of the list once confirmed', async () => {
    const table = await renderEvents()
    await userEvent.click(await table.findByRole('button', { name: 'Delete Picnic (draft)' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(table.queryByRole('row', { name: /Picnic \(draft\)/ })).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('warns when the evening is on the website now', async () => {
    const table = await renderEvents()
    await userEvent.click(await table.findByRole('button', { name: 'Delete Cultural programme' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(/It is on the website now/)
  })

  it('is refused once a headcount is recorded, and says what to do instead', async () => {
    const table = await renderEvents()
    // Counted the way the committee counts: the form under the list.
    await userEvent.selectOptions(await screen.findByLabelText('Which event'), 'Cultural programme')
    await userEvent.clear(screen.getByLabelText('Households'))
    await userEvent.type(screen.getByLabelText('Households'), '30')
    await userEvent.click(screen.getByRole('button', { name: /Record it|Correct the count/ }))
    await screen.findByRole('button', { name: 'Correct the count' })

    await userEvent.click(table.getByRole('button', { name: 'Delete Cultural programme' }))
    const asking = screen.getByRole('dialog')
    await userEvent.click(within(asking).getByRole('button', { name: 'Delete' }))

    expect(await within(asking).findByRole('alert')).toHaveTextContent('This evening has a headcount recorded, so it stays. Archive it instead.')
    expect(table.getByRole('row', { name: /Cultural programme/ })).toBeInTheDocument()
  })
})
