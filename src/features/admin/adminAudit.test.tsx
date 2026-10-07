import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { describeAction } from './AdminAuditPage'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { createMockApi, withAuditTrail, type ApiClient } from '@/lib/api'
import type { AuditEntry } from '@/domain/audit'
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

/** A trail of `count` changes, which the mock has no natural way to make that many of. */
function withTrailOf(count: number): ApiClient {
  const entries: AuditEntry[] = Array.from({ length: count }, (_, i) => ({
    id: `au-${i + 1}`,
    at: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T10:00:00`,
    action: 'update announcements',
    actorHouseholdId: 'hh-chatterjee',
    actor: 'The Chatterjees',
    subject: { kind: 'announcements', id: `an-${i + 1}` },
    changes: { title: { from: `Notice ${i + 1}`, to: `Notice ${i + 1}, amended` } },
  }))
  return { ...createMockApi(), audit: { list: async () => entries } }
}

describe('what has changed', () => {
  it('shows what moved, not merely that something did', async () => {
    renderAt('/admin/audit', admin, await withSomethingDone())
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })

    // "A row changed" answers neither of the questions this is for — who unpublished that, and
    // when did she become an admin. What it was before is half the answer.
    expect(await screen.findByText(/handledBy: nothing → The Chatterjees/)).toBeInTheDocument()
  })

  /*
   * A settings change carries the whole jsonb value — the FAQ, the committee list, every word
   * already printed on the pages — and to a browser that is one unbreakable word. It set the
   * width of the table, which set the width of the panel, which took the entire screen sideways
   * with the navigation on it. Found 2026-09-17.
   */
  it('cuts a very long value down, and keeps the whole of it on the row', async () => {
    const api = withAuditTrail(createMockApi())
    const message = (await api.contact.listMessages({ householdId: 'hh-chatterjee', role: 'admin' })).find(
      (m) => !m.handledBy && m.kind !== 'photo',
    )!
    const essay = 'Rang'.repeat(120)
    await api.contact.markHandled(message.id, { householdId: 'hh-chatterjee', role: 'admin' }, essay)

    renderAt('/admin/audit', admin, api)
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })

    const line = await screen.findByText(/handledNote: nothing →/)
    expect(line.textContent!.length).toBeLessThan(essay.length)
    expect(line.textContent).toContain('…')
    // Cut for the table, not lost: the full value is still there for anybody who wants it.
    expect(line.getAttribute('title')).toContain(essay)
  })

  /*
   * A hundred of these rows, each one several lines of changed fields, is a screen somebody
   * scrolls through rather than reads.
   */
  it('shows a screenful at a time, and says which screenful', async () => {
    renderAt('/admin/audit', admin, withTrailOf(45))
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })

    expect(await screen.findByText('1–20 of 45 changes')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(21) // twenty changes and the header
    expect(screen.getByRole('button', { name: 'Newer' })).toBeDisabled()
  })

  it('goes back and forward through the trail', async () => {
    renderAt('/admin/audit', admin, withTrailOf(45))
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })

    await userEvent.click(await screen.findByRole('button', { name: 'Older' }))
    expect(screen.getByText('21–40 of 45 changes')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Older' }))
    expect(screen.getByText('41–45 of 45 changes')).toBeInTheDocument()
    // The end of the trail, and nothing further to ask for.
    expect(screen.getByRole('button', { name: 'Older' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Newer' }))
    expect(screen.getByText('21–40 of 45 changes')).toBeInTheDocument()
  })

  it('offers no way through a trail that fits on one screen', async () => {
    renderAt('/admin/audit', admin, withTrailOf(4))
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })

    expect(await screen.findByText('1–4 of 4 changes')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Older' })).not.toBeInTheDocument()
  })

  /*
   * "Who did this?" is half of what the trail is for, and the page has said so in its own
   * subtitle since it was written. The database recorded it, the adapter read the name out
   * alongside the row — and it was dropped on the way to the screen. Found 2026-09-17.
   */
  it('says who made the change, by name', async () => {
    renderAt('/admin/audit', admin, await withSomethingDone())
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })

    const row = (await screen.findByText(/handledBy: nothing → The Chatterjees/)).closest('tr')!
    expect(within(row).getByText('The Chatterjees')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Who')).toBeInTheDocument()
  })

  /*
   * Two vocabularies reach this screen: the trigger's (`update households`) and the app's own
   * (`household:add`). Only the first was ever turned into a sentence, so the committee's
   * walkthrough — which runs on the app's wrapper — listed rows reading "messages:handle".
   */
  it('says what happened in words, whichever half of the app wrote the line', async () => {
    renderAt('/admin/audit', admin, await withSomethingDone())
    await screen.findByRole('heading', { level: 1, name: 'What has changed' })
    expect(await screen.findByText('Dealt with a message')).toBeInTheDocument()
  })

  it('has words for both vocabularies, and shows the slug for one it does not know', () => {
    // The database's.
    expect(describeAction('update households')).toBe('Changed a household')
    expect(describeAction('delete contact_messages')).toBe('Removed a message')
    // The app's.
    expect(describeAction('household:add')).toBe('Added a household')
    expect(describeAction('news:unpublish')).toBe('Took down a piece')
    expect(describeAction('album:setCover')).toBe('Chose the face of an album')
    expect(describeAction('settings:save')).toBe('Changed what the site shows')
    // And one nobody has named: unfinished rather than silent.
    expect(describeAction('spaceship:launch')).toBe('launch spaceship')
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
