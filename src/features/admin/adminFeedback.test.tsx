import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { defaultSettings } from '@/app/defaults'
import { createMockApi, type ApiClient } from '@/lib/api'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { TestDataProviders } from '@/test/render'

const member: Session = previewAccounts[0]
const admin: Session = previewAccounts[1]

function withFeedbackOn(): ApiClient {
  const base = createMockApi()
  return {
    ...base,
    delivers: true,
    settings: { ...base.settings, get: async () => ({ ...defaultSettings, showFeedback: true }) },
  }
}

function renderAt(path: string, session?: Session, api: ApiClient = withFeedbackOn()) {
  render(
    <TestDataProviders api={api} session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

describe('the feedback queue', () => {
  it('is not a door a member can walk into', async () => {
    renderAt('/admin/feedback', member)
    // The same answer every other committee screen gives: the portal, not the queue.
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Feedback' })).not.toBeInTheDocument())
  })

  it('shows what is waiting, and what has already been decided', async () => {
    renderAt('/admin/feedback', admin)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    expect(await screen.findByText(/2 waiting/)).toBeInTheDocument()
    // Everything is here, unlike the public page: waiting, approved and turned down.
    expect(screen.getByText(/On the website/)).toBeInTheDocument()
    expect(screen.getByText(/Turned down/)).toBeInTheDocument()
  })

  /**
   * The difference between a signed piece and an anonymous one is the only thing the
   * committee has to go on, so the screen says which it is in words rather than leaving it
   * to a tick nobody has been told the meaning of.
   */
  it('says where a name came from, where there is one', async () => {
    renderAt('/admin/feedback', admin)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    await userEvent.click(await screen.findByRole('button', { name: /Arjun/ }))
    expect(await screen.findByText(/came from their account/i)).toBeInTheDocument()
  })

  it('says as much when nothing is known about who wrote it', async () => {
    renderAt('/admin/feedback', admin)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    await userEvent.click((await screen.findAllByRole('button', { name: /Anonymous/ }))[0])
    expect(await screen.findByText(/Sent anonymously/i)).toBeInTheDocument()
  })
})

describe('approving a piece', () => {
  it('puts it on the public page', async () => {
    const api = withFeedbackOn()
    renderAt('/admin/feedback', admin, api)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    await userEvent.click(await screen.findByRole('button', { name: /Arjun/ }))
    await userEvent.click(await screen.findByRole('button', { name: /Approve and publish/ }))

    await waitFor(async () => {
      const approved = await api.feedback.listApproved()
      expect(approved.some((piece) => piece.authorName === 'Arjun Banerjee')).toBe(true)
    })
  })

  it('offers to take an approved one back off again', async () => {
    renderAt('/admin/feedback', admin)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    await userEvent.click(await screen.findByRole('button', { name: /Meera/ }))
    expect(await screen.findByRole('button', { name: /Take off the website/ })).toBeInTheDocument()
  })

  /**
   * Publishing is the one write here that cannot be undone quietly — it was up in between —
   * so taking it down again has to actually work rather than merely being offered.
   */
  it('really takes it down again, back into the queue', async () => {
    const api = withFeedbackOn()
    renderAt('/admin/feedback', admin, api)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    await userEvent.click(await screen.findByRole('button', { name: /Meera/ }))
    await userEvent.click(await screen.findByRole('button', { name: /Take off the website/ }))

    await waitFor(async () => {
      expect(await api.feedback.listApproved()).toHaveLength(0)
    })
    // Back to waiting rather than turned down: nobody decided against it.
    const queue = await api.feedback.listAll({ householdId: 'hh-chatterjee', role: 'admin' })
    expect(queue.find((piece) => piece.authorName === 'Meera Ghosh')?.status).toBe('pending')
  })
})

describe('turning a piece down', () => {
  /**
   * Kept rather than removed, and marked. Somebody turned down twice should not read to the
   * next reviewer as somebody nobody has looked at yet.
   */
  it('keeps it, marked, and records who decided', async () => {
    const api = withFeedbackOn()
    renderAt('/admin/feedback', admin, api)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    await userEvent.click(await screen.findByRole('button', { name: /Arjun/ }))
    await userEvent.click(await screen.findByRole('button', { name: /Turn down/ }))

    await waitFor(async () => {
      const queue = await api.feedback.listAll({ householdId: 'hh-chatterjee', role: 'admin' })
      const piece = queue.find((item) => item.authorName === 'Arjun Banerjee')
      expect(piece?.status).toBe('rejected')
      expect(piece?.reviewedBy).toBeTruthy()
    })
    // And it never reached the public page on the way through.
    expect(await api.feedback.listApproved()).not.toContainEqual(
      expect.objectContaining({ authorName: 'Arjun Banerjee' }),
    )
  })
})

describe('deleting a piece', () => {
  it('asks first, and says it is for what should not be held at all', async () => {
    renderAt('/admin/feedback', admin)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    await userEvent.click(await screen.findByRole('button', { name: /Delete/ }))

    const asking = await screen.findByRole('dialog')
    expect(asking).toHaveTextContent(/should not be held at all/)
    // And it points at the reversible thing to do instead, the way the inbox does.
    expect(asking).toHaveTextContent(/turn it down instead/)

    await userEvent.click(within(asking).getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('really removes it once confirmed', async () => {
    const api = withFeedbackOn()
    renderAt('/admin/feedback', admin, api)
    await screen.findByRole('heading', { level: 1, name: 'Feedback' })
    const before = (await api.feedback.listAll({ householdId: 'hh-chatterjee', role: 'admin' })).length

    await userEvent.click(await screen.findByRole('button', { name: /Delete/ }))
    const asking = await screen.findByRole('dialog')
    await userEvent.click(within(asking).getByRole('button', { name: 'Delete' }))

    await waitFor(async () => {
      const after = await api.feedback.listAll({ householdId: 'hh-chatterjee', role: 'admin' })
      expect(after).toHaveLength(before - 1)
    })
  })
})

/**
 * Approving something while the section is switched off publishes it to a page nobody can
 * reach. The reviewer has no way of knowing that from this screen, so the screen says it.
 */
describe('while the feedback page is switched off', () => {
  it('warns the reviewer that nothing they approve is visible', async () => {
    const base = createMockApi()
    renderAt('/admin/feedback', admin, {
      ...base,
      settings: { ...base.settings, get: async () => ({ ...defaultSettings, showFeedback: false }) },
    })
    expect(await screen.findByText(/feedback page is switched off/i)).toBeInTheDocument()
  })
})
