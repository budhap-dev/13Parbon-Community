import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { createMockApi, withAuditTrail, type ApiClient } from '@/lib/api'
import { TestDataProviders } from '@/test/render'

const member: Session = previewAccounts[0]
const admin: Session = previewAccounts[1]

function renderAt(path: string, session?: Session, api?: ApiClient) {
  render(
    <TestDataProviders session={session} api={api}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

/** A client with something already in the trail, so the table has rows to draw. */
async function withSomethingDone(): Promise<ApiClient> {
  const api = withAuditTrail(createMockApi())
  const message = (await api.contact.listMessages({ householdId: 'hh-chatterjee', role: 'admin' })).find(
    (m) => !m.handledBy && m.kind !== 'photo',
  )!
  await api.contact.markHandled(message.id, { householdId: 'hh-chatterjee', role: 'admin' })
  return api
}

describe('what has changed', () => {
  it('shows what moved, not merely that something did', async () => {
    renderAt('/admin/audit', admin, await withSomethingDone())
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })

    // "A row changed" answers neither of the questions this is for — who unpublished that, and
    // when did she become an admin. What it was before is half the answer.
    expect(await screen.findByText(/handledBy: nothing → The Chatterjees/)).toBeInTheDocument()
  })

  it('says plainly when nothing has happened yet', async () => {
    renderAt('/admin/audit', admin)
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })
    expect(await screen.findByText(/Nothing recorded yet/)).toBeInTheDocument()
  })

  it('is the committee\'s, and a member never arrives at it', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/admin/audit'] })
    render(
      <TestDataProviders session={member}>
        <RouterProvider router={router} />
      </TestDataProviders>,
    )
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(router.state.location.pathname).toBe('/portal')
  })
})
