import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { createDeliveringTestApi, TestDataProviders } from '@/test/render'

function renderAt(path: string, session?: Session, delivering = false) {
  render(
    <TestDataProviders session={session} api={delivering ? createDeliveringTestApi() : undefined}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

describe('asking for a photograph to come down', () => {
  it('arrives at a form that already knows why', async () => {
    renderAt('/contact?about=photo', undefined, true)
    // Re-typing "please take down the photograph of my daughter" into a blank box, under a
    // heading that says Contact us, is a small indignity at a moment that is not a small one.
    expect(await screen.findByLabelText('Subject')).toHaveValue('Please take down a photograph')
    expect(screen.getByRole('status')).toHaveTextContent(/which one, in whatever way\s+is easiest/)
  })

  it('repeats the promise on the form, in the same words as the gallery', async () => {
    renderAt('/contact?about=photo')
    expect(await screen.findByText(/within three days, and you do not have to give a reason/)).toBeInTheDocument()
  })

  it('meets them even where this build cannot carry a message, and says to email', async () => {
    // The gallery's promise does not depend on the contact form being switched on.
    renderAt('/contact?about=photo')
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent(/Asking us to take a photograph down/)
    expect(notice).toHaveTextContent(/Use the email address above/)
  })

  it('is an ordinary contact form for anybody else', async () => {
    renderAt('/contact', undefined, true)
    expect(await screen.findByLabelText('Subject')).toHaveValue('')
    expect(screen.queryByText(/which photograph/)).not.toBeInTheDocument()
  })
})

describe('what the committee sees', () => {
  const admin = previewAccounts[1]

  it('puts it above everything nobody has dealt with', async () => {
    renderAt('/admin/messages', admin)
    // An inbox where it arrives between a parking question and a request to sing is an inbox
    // where it waits a week.
    expect(await screen.findByRole('heading', { level: 2, name: 'Please take down a photograph' })).toBeInTheDocument()
  })

  it('counts them separately from the rest of the post', async () => {
    renderAt('/admin/messages', admin)
    const inbox = await screen.findByRole('region', { name: 'Inbox' })
    expect(within(inbox).getByText(/1 photograph to take down/)).toBeInTheDocument()
  })

  it('says to take the picture down first, and where', async () => {
    renderAt('/admin/messages', admin)
    await screen.findByRole('heading', { level: 2, name: 'Please take down a photograph' })
    expect(screen.getByText(/deleting there really\s+deletes it/)).toBeInTheDocument()
  })

  it('will not let it be marked done until somebody says what was done', async () => {
    renderAt('/admin/messages', admin)
    await screen.findByRole('heading', { level: 2, name: 'Please take down a photograph' })

    // "Handled" on its own does not say whether the photograph came out of the bucket.
    expect(screen.getByRole('button', { name: 'Mark handled' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText('What happened to the photograph'), 'Deleted boishakhi-2026-14')
    expect(screen.getByRole('button', { name: 'Mark handled' })).toBeEnabled()
  })

  it('keeps what was done, where the next person will see it', async () => {
    renderAt('/admin/messages', admin)
    await screen.findByRole('heading', { level: 2, name: 'Please take down a photograph' })

    await userEvent.type(screen.getByLabelText('What happened to the photograph'), 'Deleted boishakhi-2026-14')
    await userEvent.click(screen.getByRole('button', { name: 'Mark handled' }))

    await waitFor(() => expect(screen.getByText(/What was done: Deleted boishakhi-2026-14/)).toBeInTheDocument())
  })
})
