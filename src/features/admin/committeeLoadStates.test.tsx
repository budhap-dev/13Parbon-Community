import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { defaultSettings } from '@/app/defaults'
import type { ApiClient } from '@/lib/api'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { createEmptyApi, createFailingApi, createTestApi, TestDataProviders } from '@/test/render'

const admin = previewAccounts[1]

function renderAt(path: string, api: ApiClient) {
  render(
    <TestDataProviders session={admin} api={api}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

/** A read that never answers, for what a screen says while it waits. */
const never = () => new Promise<never>(() => {})

afterEach(() => vi.restoreAllMocks())

/*
 * A committee screen that fails to load must never say the data is not there. "No messages yet"
 * over a database that did not answer reads as every message being gone, and somebody acts on it.
 */
describe('when the committee screens cannot load', () => {
  it('the inbox says it could not load, not that there is nothing in it', async () => {
    renderAt('/admin/messages', createFailingApi())
    expect(await screen.findByText('We could not load the messages just now.')).toBeInTheDocument()
    expect(screen.queryByText('No messages yet.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('the feedback queue says it could not load', async () => {
    renderAt('/admin/feedback', createFailingApi())
    expect(await screen.findByText('We could not load the feedback just now.')).toBeInTheDocument()
    expect(screen.queryByText('Nothing has come in yet.')).not.toBeInTheDocument()
  })

  it('the trail says it could not load', async () => {
    renderAt('/admin/audit', createFailingApi())
    expect(await screen.findByText('We could not load the trail just now.')).toBeInTheDocument()
    expect(screen.queryByText(/Nothing recorded yet/)).not.toBeInTheDocument()
  })

  it('the albums say they could not load', async () => {
    renderAt('/admin/media', createFailingApi())
    expect(await screen.findByText('We could not load the albums just now.')).toBeInTheDocument()
    expect(screen.queryByText('No albums yet.')).not.toBeInTheDocument()
  })

  it('the overview shows no figure it does not have, and never "Nothing waiting"', async () => {
    renderAt('/admin', createFailingApi())
    expect(await screen.findByText('We could not load some of these figures just now.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('could not be loaded')).toHaveLength(5))
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nothing waiting/)).not.toBeInTheDocument()
    expect(screen.getByText(/there may be things waiting/)).toBeInTheDocument()
  })

  it('the overview shows a dot rather than a 0 while it is still asking', async () => {
    const api = createTestApi()
    renderAt('/admin', { ...api, contact: { ...api.contact, listMessages: never } })
    // The others arrive; the unread count does not, and must not read as none.
    await screen.findByText('tried to sign in, not on the list')
    const unread = screen.getByText('Unread').parentElement!
    expect(within(unread).getByText('…')).toBeInTheDocument()
    expect(screen.queryByText(/Nothing waiting/)).not.toBeInTheDocument()
  })

  it('the overview tries every failed figure again', async () => {
    const api = createTestApi()
    let failing = true
    const listMessages: ApiClient['contact']['listMessages'] = async (viewer) => {
      if (failing) throw new Error('the network is down')
      return api.contact.listMessages(viewer)
    }
    renderAt('/admin', { ...api, contact: { ...api.contact, listMessages } })
    await screen.findByText('We could not load some of these figures just now.')
    failing = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() =>
      expect(screen.queryByText('We could not load some of these figures just now.')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('messages from the public')).toBeInTheDocument()
  })

  it('the people screen does not say "0 households" over a list that failed', async () => {
    renderAt('/admin/people', createFailingApi())
    expect(await screen.findByText('We could not load the households just now.')).toBeInTheDocument()
    expect(screen.queryByText(/0 households/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Members list' })).not.toBeInTheDocument()
    // Nobody knocking and the knocks not loading are not the same thing.
    expect(screen.getByText('We could not load who has tried to sign in just now.')).toBeInTheDocument()
  })

  it('the events screen says so, rather than loading for ever', async () => {
    renderAt('/admin/events', createFailingApi())
    expect(await screen.findByText('We could not load the events just now.')).toBeInTheDocument()
    expect(screen.getByText('We could not load the events and their counts just now.')).toBeInTheDocument()
    expect(screen.queryByText('Loading the events…')).not.toBeInTheDocument()
  })

  it('the events screen with no events at all says that, rather than loading for ever', async () => {
    renderAt('/admin/events', { ...createEmptyApi(), settings: { ...createEmptyApi().settings, get: async () => defaultSettings } })
    expect(await screen.findByText('No events yet. Add the first with New event.')).toBeInTheDocument()
    expect(await screen.findByText(/No events to count yet/)).toBeInTheDocument()
    expect(screen.queryByText('Loading the events…')).not.toBeInTheDocument()
  })

  it('the content screen keeps the settings form shut when what is saved could not be read', async () => {
    renderAt('/admin/content', createFailingApi())
    expect(await screen.findByText('We could not load what is saved just now.')).toBeInTheDocument()
    expect(screen.queryByText(/Reading what is saved/)).not.toBeInTheDocument()
    // No Save to press: opened on the fallback, it would write the code's version over theirs.
    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument()
    expect(screen.getByText('We could not load the albums just now.')).toBeInTheDocument()
    expect(screen.getByText('We could not load the newsletters just now.')).toBeInTheDocument()
  })

  it('the content screen opens the settings form once a retry reads them', async () => {
    const api = createTestApi()
    let failing = true
    const get: ApiClient['settings']['get'] = async () => {
      if (failing) throw new Error('the network is down')
      return api.settings.get()
    }
    renderAt('/admin/content', { ...api, settings: { ...api.settings, get } })
    const alert = (await screen.findByText('We could not load what is saved just now.')).parentElement!
    failing = false
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.queryByText('We could not load what is saved just now.')).not.toBeInTheDocument())
    expect(screen.queryByText(/Reading what is saved/)).not.toBeInTheDocument()
  })

  it('the noticeboard says it could not load, not that the board is empty', async () => {
    renderAt('/admin/content?tab=notices', createFailingApi())
    expect(await screen.findByText('We could not load the notices just now.')).toBeInTheDocument()
    expect(screen.queryByText('Nothing on the board.')).not.toBeInTheDocument()
  })

  it('the writing says it could not load, rather than showing an empty table', async () => {
    renderAt('/admin/content?tab=writing', createFailingApi())
    expect(await screen.findByText('We could not load the writing just now.')).toBeInTheDocument()
  })
})

describe('the people screen, when a write fails', () => {
  it('says a copy could not be gathered, rather than looking slow', async () => {
    const api = createTestApi()
    renderAt('/admin/people', {
      ...api,
      portal: {
        ...api.portal,
        exportHousehold: async () => {
          throw new Error('The server did not answer.')
        },
      },
    })
    const edits = await screen.findAllByRole('button', { name: /^Edit / })
    // The first household that is not the signed-in admin's own, which cannot be removed here.
    const other = edits.find((button) => !button.closest('tr')?.textContent?.includes('(you)'))!
    await userEvent.click(other)
    await userEvent.click(screen.getByRole('button', { name: 'Remove this household' }))
    await userEvent.click(screen.getByRole('button', { name: 'Show me everything you hold' }))

    expect(await screen.findByText(/We could not gather the copy just now\. The server did not answer\./)).toHaveAttribute(
      'role',
      'alert',
    )
  })

  it('says an ignore did not save', async () => {
    const api = createTestApi()
    renderAt('/admin/people', {
      ...api,
      portal: {
        ...api.portal,
        resolveSignInAttempt: async () => {
          throw new Error('Permission denied.')
        },
      },
    })
    const [ignore] = await screen.findAllByRole('button', { name: /^Ignore / })
    await userEvent.click(ignore)
    expect(await screen.findByText(/That did not save, so they are still on the list\. Permission denied\./)).toHaveAttribute(
      'role',
      'alert',
    )
  })

  it('says a household was added, once it has been', async () => {
    renderAt('/admin/people', createTestApi())
    await userEvent.click(await screen.findByRole('button', { name: 'Add a household' }))
    await userEvent.type(await screen.findByLabelText('Household name'), 'The Duttas')
    await userEvent.type(screen.getByLabelText('Who the committee speaks to'), 'Sujata Dutta')
    await userEvent.type(screen.getByLabelText('Email'), 'sujata@example.com')
    await userEvent.type(screen.getByLabelText('Name'), 'Sujata Dutta')
    await userEvent.type(screen.getByLabelText(/Google address/), 'sujata.dutta@gmail.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add the household' }))

    expect(await screen.findByText('The Duttas is added.')).toHaveAttribute('role', 'status')
  })
})
