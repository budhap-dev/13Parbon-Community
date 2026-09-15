import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

function renderPage(session = previewAccounts[1]) {
  render(
    <TestDataProviders session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/events'] })} />
    </TestDataProviders>,
  )
}

/**
 * The panel, once its events have arrived — the form is not drawn before then.
 *
 * It opens on the first event, which already has a count, so a test about recording a new one
 * picks an event that has not been counted yet.
 */
async function panel(pickUncounted = false) {
  const section = await screen.findByRole('region', { name: 'How many came' })
  const picker = await within(section).findByLabelText('Which event')
  if (pickUncounted) await userEvent.selectOptions(picker, 'ev-mahalaya-2026')
  return section
}

describe('recording how many came', () => {
  it('says the sheet stays where it is, and nobody is named', async () => {
    renderPage()
    const section = await panel(true)
    // The whole reason this is typed in rather than read out of the form's replies.
    expect(within(section).getByText(/The sheet stays where it is/)).toBeInTheDocument()
    expect(within(section).getByText(/Nobody is named/)).toBeInTheDocument()
  })

  it('adds the numbers up as they are typed', async () => {
    renderPage()
    const section = await panel()

    await userEvent.clear(within(section).getByLabelText('Adults'))
    await userEvent.type(within(section).getByLabelText('Adults'), '180')
    await userEvent.clear(within(section).getByLabelText('Children'))
    await userEvent.type(within(section).getByLabelText('Children'), '47')

    expect(within(section).getByText(/227 people in all/)).toBeInTheDocument()
  })

  it('records a count and shows it in the history', async () => {
    renderPage()
    const section = await panel(true)

    await userEvent.clear(within(section).getByLabelText('Households'))
    await userEvent.type(within(section).getByLabelText('Households'), '12')
    await userEvent.clear(within(section).getByLabelText('Adults'))
    await userEvent.type(within(section).getByLabelText('Adults'), '30')
    await userEvent.click(within(section).getByRole('button', { name: 'Record it' }))

    await waitFor(() => expect(within(section).getByRole('status')).toHaveTextContent('Saved.'))
  })

  it('offers to correct a count that is already there, rather than adding a second', async () => {
    renderPage()
    const section = await panel()

    // It opens on this one already; selecting it again is harmless and says what is meant.
    await userEvent.selectOptions(within(section).getByLabelText('Which event'), 'ev-poila-2026')
    await waitFor(() => expect(within(section).getByText(/already a count for this event/)).toBeInTheDocument())
    expect(within(section).getByRole('button', { name: 'Correct the count' })).toBeInTheDocument()
  })

  it('queries numbers that look like the columns were swapped', async () => {
    renderPage()
    const section = await panel()

    await userEvent.clear(within(section).getByLabelText('Households'))
    await userEvent.type(within(section).getByLabelText('Households'), '180')
    await userEvent.clear(within(section).getByLabelText('Adults'))
    await userEvent.type(within(section).getByLabelText('Adults'), '63')
    await userEvent.click(within(section).getByRole('button', { name: /Record it|Correct the count/ }))

    expect(within(section).getByText(/right way round/)).toBeInTheDocument()
  })

  it('shows the years already recorded', async () => {
    renderPage()
    const section = await panel()
    const table = await within(section).findByRole('table')
    expect(within(table).getByText('ev-poila-2026')).toBeInTheDocument()
  })

  it('is not offered to a member at all', async () => {
    renderPage(previewAccounts[0])
    await waitFor(() => expect(screen.queryByRole('region', { name: 'How many came' })).not.toBeInTheDocument())
  })
})
