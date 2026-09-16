import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { TestDataProviders } from '@/test/render'

const member: Session = previewAccounts[0]
const admin: Session = previewAccounts[1]

function renderAt(path: string, session?: Session) {
  render(
    <TestDataProviders session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

/**
 * Deleting a message, which is the one thing in the inbox that cannot be undone.
 *
 * A message is the only record the committee holds of something somebody asked for, and the
 * subject-access export finds a household's messages by matching the address they wrote from.
 * So the screen asks first, says what is lost, and points at marking it handled instead.
 */
describe('deleting a message', () => {
  it('asks before it does it, and can be called off', async () => {
    renderAt('/admin/messages', admin)
    await screen.findByRole('heading', { level: 1, name: 'Messages' })
    const before = (await screen.findAllByRole('listitem')).length

    await userEvent.click(screen.getByRole('button', { name: /Delete/ }))
    expect(screen.getByRole('alert')).toHaveTextContent(/only record the committee holds/)

    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('button', { name: 'Delete for good' })).not.toBeInTheDocument()
    expect(await screen.findAllByRole('listitem')).toHaveLength(before)
  })

  it('points at marking it handled, which keeps it', async () => {
    renderAt('/admin/messages', admin)
    // The heading is drawn above the loading branch, so waiting for it is not waiting for the
    // inbox. The list is what has to be there before there is anything to delete.
    await screen.findAllByRole('listitem')
    await userEvent.click(screen.getByRole('button', { name: /Delete/ }))
    expect(screen.getByRole('alert')).toHaveTextContent(/mark it handled instead/)
  })

  it('takes it off the list once confirmed', async () => {
    renderAt('/admin/messages', admin)
    await screen.findByRole('heading', { level: 1, name: 'Messages' })
    const before = (await screen.findAllByRole('listitem')).length

    await userEvent.click(screen.getByRole('button', { name: /Delete/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete for good' }))

    await waitFor(async () => expect(await screen.findAllByRole('listitem')).toHaveLength(before - 1))
  })

  it('is not offered to a member, who cannot reach the inbox at all', async () => {
    renderAt('/admin/messages', member)
    // The route itself sends them back; there is no inbox to delete from.
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Messages' })).not.toBeInTheDocument())
  })
})
