import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { buildFixtures } from '@/lib/api/mock/fixtures'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { expectNoAxeViolations } from '@/test/axe'
import { TestDataProviders } from '@/test/render'

const member: Session = previewAccounts[0]
const admin: Session = previewAccounts[1]

function renderAt(path: string, session: Session = admin) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <TestDataProviders session={session}>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  return router
}

/** The Search in the header — the one place it is, at every width. */
const searchButton = async () => within(await screen.findByRole('banner')).getByRole('button', { name: 'Search' })

/** Opens the search from the header and types into it. */
async function search(text: string) {
  await userEvent.click(await searchButton())
  const box = within(await screen.findByRole('dialog', { name: 'Search the portal' })).getByRole('combobox')
  await userEvent.type(box, text)
  return box
}

const option = (name: RegExp | string) => screen.findByRole('option', { name })

describe('the committee’s search', () => {
  it('is in the header for the committee', async () => {
    renderAt('/admin')
    expect(await searchButton()).toBeInTheDocument()
  })

  it('is not offered to a member, who has nothing of the committee’s to look for', async () => {
    renderAt('/portal', member)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: /^Search/ })).not.toBeInTheDocument()
  })

  it('opens from the keyboard, and Escape gives the focus back', async () => {
    renderAt('/admin')
    const trigger = await searchButton()
    trigger.focus()
    await userEvent.keyboard('{Control>}k{/Control}')
    const box = within(await screen.findByRole('dialog')).getByRole('combobox')
    expect(box).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('lists the screens before anything is typed', async () => {
    renderAt('/admin')
    await userEvent.click(await searchButton())
    expect(await option(/^Photographs/)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^What has changed/ })).toBeInTheDocument()
  })

  it('takes Enter to the household, already open', async () => {
    renderAt('/admin')
    await search('dases')
    await option(/The Dases/)
    await userEvent.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { level: 1, name: 'The Dases' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves with the arrows', async () => {
    renderAt('/admin')
    const box = await search('the')
    await screen.findAllByRole('option')
    const first = box.getAttribute('aria-activedescendant')
    await userEvent.keyboard('{ArrowDown}')
    expect(box.getAttribute('aria-activedescendant')).not.toBe(first)
    await userEvent.keyboard('{ArrowUp}')
    expect(box.getAttribute('aria-activedescendant')).toBe(first)
  })

  it('opens a message from something it said', async () => {
    renderAt('/admin')
    await search('learning for three years')
    await userEvent.click(await option(/Can my daughter sing/))

    expect(await screen.findByRole('heading', { level: 2, name: 'Can my daughter sing at the programme?' })).toBeInTheDocument()
  })

  it('opens an evening in the designer', async () => {
    renderAt('/admin')
    await search('cultural programme')
    await userEvent.click(await option(/^Cultural programme/))

    expect(await screen.findByText('Designing')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Cultural programme' })).toBeInTheDocument()
  })

  it('opens an album', async () => {
    const album = buildFixtures().albums[0]
    renderAt('/admin')
    await search(album.title)
    const albums = within(await screen.findByRole('group', { name: /Photo albums/ }))
    await userEvent.click(albums.getAllByRole('option')[0])

    expect(await screen.findByRole('heading', { level: 1, name: album.title })).toBeInTheDocument()
  })

  it('opens a poll ready to change', async () => {
    renderAt('/admin')
    await search('autumn picnic')
    await userEvent.click(await option(/autumn picnic/))

    expect(await screen.findByRole('heading', { level: 2, name: 'Change the poll' })).toBeInTheDocument()
  })

  it('finds a festival, and opens the section that edits it', async () => {
    const router = renderAt('/admin')
    await search('holi')
    const pages = within(await screen.findByRole('group', { name: /On the public pages/ }))
    await userEvent.click(pages.getByRole('option', { name: /^Holi/ }))

    const head = await screen.findByRole('button', { name: /The year’s festivals/ })
    await waitFor(() => expect(head).toHaveAttribute('aria-expanded', 'true'))
    expect(head).toHaveFocus()
    // Done with, so closing the section is not undone by the address.
    await waitFor(() => expect(router.state.location.search).toBe('?tab=content'))
  })

  it('says so when nothing matches', async () => {
    renderAt('/admin')
    await search('zzzzqx')
    expect(await screen.findByText('Nothing matches “zzzzqx”.')).toBeInTheDocument()
  })

  it('passes the automated accessibility checks while open', async () => {
    renderAt('/admin')
    await search('ruma')
    await option(/The Dases/)
    await expectNoAxeViolations(document.body)
  })
})

describe('a link to one thing', () => {
  it('opens that household, and leaves the address tidy behind it', async () => {
    const router = renderAt('/admin/people?open=hh-das')
    expect(await screen.findByRole('heading', { level: 1, name: 'The Dases' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('lands on the list when the thing is not there any more', async () => {
    const router = renderAt('/admin/people?open=hh-gone')
    expect(await screen.findByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('opens a piece of writing on its own tab', async () => {
    const post = buildFixtures().posts[0]
    renderAt(`/admin/content?tab=writing&open=${post.id}`)
    expect(await screen.findByRole('heading', { level: 2, name: 'Edit the piece' })).toBeInTheDocument()
  })
})
