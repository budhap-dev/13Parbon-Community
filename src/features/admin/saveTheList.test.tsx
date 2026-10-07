import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

const admin = previewAccounts[1]

function renderPeople() {
  render(
    <TestDataProviders session={admin}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/people'] })} />
    </TestDataProviders>,
  )
}

/** Watches for the file being made, which is the moment the list leaves the portal. */
function watchDownloads() {
  const made = vi.fn(() => 'blob:list')
  URL.createObjectURL = made as never
  URL.revokeObjectURL = vi.fn() as never
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  return made
}

afterEach(() => vi.restoreAllMocks())

/**
 * "Save the list" asks before it downloads.
 *
 * The file has every household's contact details in it, and it used to land in Downloads on the
 * first press — including a press meant only to find out what the button did.
 */
describe('saving the list of households', () => {
  it('asks first, and says it is a spreadsheet for Excel', async () => {
    const made = watchDownloads()
    renderPeople()
    await userEvent.click(await screen.findByRole('button', { name: 'Save the list' }))

    const asking = await screen.findByRole('dialog', { name: 'Download the list for Excel?' })
    expect(asking).toHaveTextContent(/opens in Excel/)
    expect(asking).toHaveTextContent(/\.csv/)
    expect(asking).toHaveTextContent(/email and phone/)
    expect(made).not.toHaveBeenCalled()
  })

  it('downloads nothing when it is called off', async () => {
    const made = watchDownloads()
    renderPeople()
    await userEvent.click(await screen.findByRole('button', { name: 'Save the list' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Not now' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(made).not.toHaveBeenCalled()
  })

  it('downloads once it is confirmed', async () => {
    const made = watchDownloads()
    renderPeople()
    await userEvent.click(await screen.findByRole('button', { name: 'Save the list' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Download' }))

    expect(made).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
