import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { createEmptyApi, TestDataProviders } from '@/test/render'
import { createMockApi } from '@/lib/api/mock'
import type { ApiClient } from '@/lib/api'

const member: Session = previewAccounts[0]
const admin: Session = previewAccounts[1]

function renderAt(path: string, session?: Session, api?: ApiClient) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <TestDataProviders session={session} api={api}>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  return router
}

/**
 * Which of the three the banner is telling you.
 *
 * It used to be drawn unconditionally, which made it a lie in two of them — and the expensive
 * one was silence: an address the committee has not recorded is treated as an admin by the app
 * and as a stranger by the database, so every screen loads, looks right, and is empty. A real
 * message sent through the live contact form did not appear in the inbox, and nothing anywhere
 * said why.
 */
describe('what the portal says about which sign-in you are in', () => {
  const unmatched: Session = {
    role: 'admin',
    householdId: '',
    householdName: 'No household yet',
    name: 'Budhaditya Pandit',
    email: 'panditbudhaditya@gmail.com',
  }

  const recorded: Session = {
    role: 'admin',
    householdId: 'hh-chatterjee',
    householdName: 'The Chatterjees',
    name: 'Debashis Chatterjee',
    email: 'd.chatterjee@gmail.com',
  }

  it('says it is a preview when it is one', async () => {
    renderAt('/portal', admin)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(screen.getByText(/made-up data/)).toBeInTheDocument()
  })

  it('says nothing of the sort to somebody signed in for real', async () => {
    renderAt('/portal', recorded)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    // Telling somebody their real edits are make-believe is the one thing a back office
    // must not get wrong.
    expect(screen.queryByText(/made-up data/)).not.toBeInTheDocument()
    expect(screen.queryByText(/No household yet/)).not.toBeInTheDocument()
  })

  it('explains the empty screens when the committee has not recorded your address', async () => {
    renderAt('/portal', unmatched)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    // Scoped to the banner: the address is in the sidebar too, and it is the banner naming
    // which address the database found nothing for that makes the empty screens legible.
    const banner = screen.getByRole('status')
    expect(within(banner).getByText(/has not recorded a household/)).toBeInTheDocument()
    expect(within(banner).getByText(/panditbudhaditya@gmail.com/)).toBeInTheDocument()
    expect(screen.queryByText(/made-up data/)).not.toBeInTheDocument()
  })
})

/**
 * A household with no renewal date, which is what the database actually hands back.
 *
 * `membership_status` defaults to `active` and `membership_paid_to` has no default, so this is
 * the state of every household the committee writes down — and it took the whole portal out
 * with `RangeError: Invalid time value` on the first real sign-in, because the mapper turned
 * the missing date into an empty string and the dashboard formatted it.
 */
describe('a household nobody has recorded a renewal date for', () => {
  function apiWithUnpaidHousehold(): ApiClient {
    const api = createMockApi()
    return {
      ...api,
      portal: {
        ...api.portal,
        getHousehold: async (id, viewer) => {
          const household = await api.portal.getHousehold(id, viewer)
          return household ? { ...household, membership: { status: 'active', paidTo: null } } : null
        },
      },
    }
  }

  it('says so, instead of taking the page down', async () => {
    renderAt('/portal', member, apiWithUnpaidHousehold())
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(await screen.findByText(/No renewal date recorded yet/)).toBeInTheDocument()
  })
})

describe('portal access', () => {
  it('sends a visitor to sign in', async () => {
    const router = renderAt('/portal')
    expect(await screen.findByRole('heading', { level: 1, name: 'Member sign-in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('keeps a member out of the committee section', async () => {
    const router = renderAt('/admin', member)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(router.state.location.pathname).toBe('/portal')
  })

  it('shows a member their own navigation only', async () => {
    renderAt('/portal', member)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(screen.getByRole('navigation', { name: 'Your household' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Committee' })).not.toBeInTheDocument()
    expect(screen.getByText('Rina Sen')).toBeInTheDocument()
    expect(screen.getByText(/made-up data/)).toBeInTheDocument()
  })

  it('gives an admin both sections and signs them out again', async () => {
    const router = renderAt('/admin', admin)
    await screen.findByRole('heading', { level: 1, name: 'Committee overview' })
    expect(screen.getByRole('navigation', { name: 'Your household' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Committee' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Member sign-in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})

describe('member pages', () => {
  it('leads the dashboard with the next event and a way to book', async () => {
    renderAt('/portal', member)
    const feature = (await screen.findByRole('heading', { level: 2, name: 'Cultural programme' })).closest('section')!
    // We no longer know whether this household has booked — the replies are in the committee's
    // form — so the page says how many are coming and offers the way through, and claims nothing.
    expect(within(feature).getByText(/households are coming so far/)).toBeInTheDocument()
    expect(within(feature).getByText('37')).toBeInTheDocument()
    expect(within(feature).getByRole('link', { name: 'Book your places' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Active' })).toBeInTheDocument()
  })

  it('shows the household, its people and the sharing choices', async () => {
    renderAt('/portal/household', member)
    expect(await screen.findByRole('heading', { level: 1, name: 'My household' })).toBeInTheDocument()
    expect(screen.getByText('Mira Sen')).toBeInTheDocument()
    expect(screen.getByText('Child, 7')).toBeInTheDocument()
    expect(screen.getByLabelText('List us in the directory: on')).toBeInTheDocument()
    expect(screen.getByLabelText('Show our phone: off')).toBeInTheDocument()
    expect(screen.getByText('rina.sen@gmail.com')).toBeInTheDocument()
  })

  it('lists only households that opted in, and never a child by name', async () => {
    renderAt('/portal/directory', member)
    const az = (await screen.findByRole('heading', { name: 'A to Z' })).closest('section')!
    const names = within(az)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '')
    expect(names.some((n) => n.includes('The Sens'))).toBe(true)
    expect(names.some((n) => n.includes('The Mitras'))).toBe(false)
    expect(names.join(' ')).not.toContain('Mira')
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('lists the documents newest first', async () => {
    renderAt('/portal/documents', member)
    const rows = await screen.findAllByRole('row')
    expect(rows[1]).toHaveTextContent('Stage plan and equipment list')
    expect(rows[1]).toHaveTextContent('Resources')
    expect(rows[1]).toHaveTextContent('3 September 2026')
  })

  it('says so plainly when there is nothing to show', async () => {
    renderAt('/portal/documents', member, createEmptyApi())
    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument()
  })
})

describe('committee pages', () => {
  it('counts what needs attention and how the event is filling', async () => {
    renderAt('/admin', admin)
    expect(await screen.findByRole('heading', { level: 1, name: 'Committee overview' })).toBeInTheDocument()
    expect(await screen.findByText('priya.dutta@gmail.com')).toBeInTheDocument()
    const stats = screen.getByText('Waiting on you').closest('div')!
    expect(within(stats).getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/6 have signed in, 2 admins/)).toBeInTheDocument()
  })

  it('shows who tried to sign in and every household with its role', async () => {
    renderAt('/admin/people', admin)
    const attempts = (await screen.findByRole('heading', { name: 'Tried to sign in, not on the list' })).closest('section')!
    expect(within(attempts).getByText('amit.bose@gmail.com')).toBeInTheDocument()
    const members = screen.getByRole('heading', { name: 'Members' }).closest('section')!
    expect(within(members).getAllByText('Admin')).toHaveLength(2)
    expect(within(members).getAllByText('Never signed in')).toHaveLength(2)
    expect(within(members).getByText('Lapsed')).toBeInTheDocument()
  })

  it('keeps the headcount, and says where the bookings actually live', async () => {
    renderAt('/admin/events', admin)
    expect(await screen.findByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
    // No household is named anywhere on this page any more, and the page says why.
    expect(screen.getByText(/how many came/)).toBeInTheDocument()
    expect(screen.queryByText('The Roys')).not.toBeInTheDocument()
    expect(screen.queryByText('Wheelchair access needed')).not.toBeInTheDocument()
  })

  it('links the separate event planner once on the page, and says which does what', async () => {
    renderAt('/admin/events', admin)
    const sidebar = await screen.findByRole('navigation', { name: 'Other tools' })
    const link = within(sidebar).getByRole('link', { name: /Event planning/ })
    expect(link).toHaveAttribute('href', 'https://13parbon-event-management.vercel.app/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
    const panel = screen.getByRole('heading', { level: 2, name: 'Event planning' }).closest('section')!
    // It answers "which one do I use?", which is the only reason it is here and not just in
    // the sidebar — the link used to be on this page four times over.
    expect(within(panel).getByText('Here')).toBeInTheDocument()
    expect(within(panel).getByText('In the planner')).toBeInTheDocument()
    expect(within(panel).getByText(/who is bringing the urn/)).toBeInTheDocument()
  })

  it('does not offer the planner four times over on one screen', async () => {
    renderAt('/admin/events', admin)
    await screen.findAllByRole('table')

    // It was in the header, in a panel, beside "New event", and in the sidebar. Beside
    // "New event" was the worst of them: two buttons together read as two ways to do one job.
    const planner = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === 'https://13parbon-event-management.vercel.app/')
    expect(planner).toHaveLength(2)

    // And in particular, not beside "New event" any more.
    const table = screen.getByRole('heading', { name: 'All events' }).closest('section')!
    expect(within(table).queryByRole('link', { name: /planner/i })).not.toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'New event' })).toBeInTheDocument()
  })

  it('keeps the planner in reach on every committee page', async () => {
    for (const path of ['/admin', '/admin/people', '/admin/content']) {
      const { unmount } = render(<div />)
      unmount()
      renderAt(path, admin)
      const sidebar = await screen.findByRole('navigation', { name: 'Other tools' })
      expect(within(sidebar).getByRole('link', { name: /Event planning/ })).toBeInTheDocument()
      cleanup()
    }
  })

  it('shows the planner only to the committee', async () => {
    renderAt('/portal', member)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    expect(screen.queryByRole('navigation', { name: 'Other tools' })).not.toBeInTheDocument()
  })

  it('counts the gaps from the pages themselves, not from a number somebody typed', async () => {
    renderAt('/admin/content', admin)
    // It said 24 — 7, 13 and 4, written when the pages were built and never recounted. By the
    // time anybody looked, the committee had filled in all but one of them.
    expect(await screen.findByText(/1 gap still showing publicly/)).toBeInTheDocument()
    expect(screen.getByText(/cannot go stale/)).toBeInTheDocument()
    expect(screen.getByText('Home page')).toBeInTheDocument()
  })

  it('names which ones, rather than sending somebody looking through a file', async () => {
    renderAt('/admin/content', admin)
    await screen.findByText('Home page')
    expect(screen.getByText('missionStatement')).toBeInTheDocument()
    // And says so plainly where a page is finished.
    expect(screen.getAllByText('Nothing in brackets').length).toBeGreaterThan(0)
  })

  it('opens a message from the inbox', async () => {
    renderAt('/admin/messages', admin)
    // The inbox opens on the takedown now: it sorts above everything nobody has dealt with.
    expect(await screen.findByRole('heading', { level: 2, name: 'Please take down a photograph' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Parking on the night/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'Parking on the night' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /New to the area/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'New to the area' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reply by email' })).toHaveAttribute('href', 'mailto:ruma@example.com')
  })

  // The first write in the app, end to end: contract, mock, mutation, cache invalidation,
  // and a screen that shows what the data says afterwards rather than what the click hoped.
  it('marks a message handled, and the inbox agrees afterwards', async () => {
    renderAt('/admin/messages', admin)
    const inbox = await screen.findByRole('region', { name: 'Inbox' })
    // Open an ordinary message: a takedown cannot be marked done without saying what was done.
    await userEvent.click(within(inbox).getByRole('button', { name: /Parking on the night/ }))
    // One fixture message is already dealt with, so count rather than assume an empty start.
    const before = within(inbox).queryAllByText(/handled by/).length
    const unreadBefore = within(inbox).getByText(/unread/).textContent

    await userEvent.click(await screen.findByRole('button', { name: 'Mark handled' }))

    expect(await screen.findByRole('button', { name: 'Handled' })).toBeDisabled()
    // Not just the open message: the list beside it is redrawn from the same refreshed data.
    expect(within(inbox).queryAllByText(/handled by/).length).toBe(before + 1)
    expect(within(inbox).getByText(/unread/).textContent).not.toBe(unreadBefore)
  })

  it('does not offer to handle a message twice', async () => {
    renderAt('/admin/messages', admin)
    const inbox = await screen.findByRole('region', { name: 'Inbox' })
    await userEvent.click(within(inbox).getByRole('button', { name: /Parking on the night/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Mark handled' }))
    expect(await screen.findByRole('button', { name: 'Handled' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Mark handled' })).not.toBeInTheDocument()
  })
})

describe('a household editing itself', () => {
  it('saves a change and shows it back on the page afterwards', async () => {
    renderAt('/portal/household', member)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))

    const contact = await screen.findByLabelText('Who the committee speaks to')
    await userEvent.clear(contact)
    await userEvent.type(contact, 'Rina S Sen')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    // Back on the read-only page, showing what was saved rather than what was typed.
    expect(await screen.findByRole('heading', { level: 1, name: 'My household' })).toBeInTheDocument()
    expect(await screen.findByText('Rina S Sen')).toBeInTheDocument()
  })

  it('turns a privacy choice on and keeps it', async () => {
    renderAt('/portal/household', member)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    await userEvent.click(await screen.findByLabelText('Show our phone number'))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('img', { name: 'Show our phone: on' })).toBeInTheDocument()
  })

  it('is not offered the committee\'s fields on its own household', async () => {
    renderAt('/portal/household', member)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    await screen.findByLabelText('Household name')

    expect(screen.queryByLabelText(/Google address/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Membership')).not.toBeInTheDocument()
  })

  it('backs out without saving', async () => {
    renderAt('/portal/household', member)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const contact = await screen.findByLabelText('Who the committee speaks to')
    await userEvent.clear(contact)
    await userEvent.type(contact, 'Somebody Else')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Back on the read-only page with nothing kept. Rina's name appears both as the contact
    // and as a person in the household, so count rather than expect one.
    expect(await screen.findByRole('heading', { level: 1, name: 'My household' })).toBeInTheDocument()
    expect(screen.getAllByText('Rina Sen').length).toBeGreaterThan(0)
    expect(screen.queryByText('Somebody Else')).not.toBeInTheDocument()
  })
})

describe('asking what we hold', () => {
  it('shows it on the page, in something a person can read', async () => {
    renderAt('/portal/household', member)
    await userEvent.click(await screen.findByRole('button', { name: /Show me everything you hold/ }))

    // Scoped: the page already lists the household's people above, so "Dance group" is on
    // screen twice once the copy is gathered.
    const panel = screen.getByRole('region', { name: 'Everything we hold about you' })
    expect(await within(panel).findByText(/People \(3\)/)).toBeInTheDocument()
    // The notes written about people are data about those people, so they are in it.
    expect(within(panel).getByText(/Dance group/)).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Save it as a file' })).toBeInTheDocument()
  })

  it('does not gather it until somebody asks', async () => {
    renderAt('/portal/household', member)
    await screen.findByRole('heading', { level: 1, name: 'My household' })
    // Reaching across most of the tables is not something to do because a page was opened.
    expect(screen.queryByText(/People \(3\)/)).not.toBeInTheDocument()
  })

  it('says what it cannot tell them, rather than leaving a silence', async () => {
    renderAt('/portal/household', member)
    await userEvent.click(await screen.findByRole('button', { name: /Show me everything you hold/ }))
    expect(await screen.findByText(/we hold no record of who appears in which one/)).toBeInTheDocument()
  })
})

describe('the committee managing households', () => {
  it('invites a household, and it joins the list', async () => {
    renderAt('/admin/people', admin)
    await userEvent.click(await screen.findByRole('button', { name: 'Add a household' }))

    await userEvent.type(await screen.findByLabelText('Household name'), 'The Duttas')
    await userEvent.type(screen.getByLabelText('Who the committee speaks to'), 'Sujata Dutta')
    await userEvent.type(screen.getByLabelText('Email'), 'sujata@example.com')
    await userEvent.type(screen.getByLabelText('Name'), 'Sujata Dutta')
    await userEvent.type(screen.getByLabelText(/Google address/), 'sujata.dutta@gmail.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add the household' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument()
    // The households table is the second one; the first lists who tried to sign in.
    const [, table] = await screen.findAllByRole('table')
    expect(within(table).getAllByRole('row', { name: /The Duttas/ })).toHaveLength(1)
  })

  it('will not invite a household with nobody named in it', async () => {
    renderAt('/admin/people', admin)
    await userEvent.click(await screen.findByRole('button', { name: 'Add a household' }))
    await userEvent.type(await screen.findByLabelText('Household name'), 'The Nameless')
    await userEvent.click(screen.getByRole('button', { name: 'Add the household' }))

    // Still on the form, and told what is missing.
    expect(screen.getByRole('button', { name: 'Add the household' })).toBeInTheDocument()
    expect(screen.getByText(/Who should the committee speak to/)).toBeInTheDocument()
  })

  it('offers the list as a spreadsheet, and says what it leaves out', async () => {
    renderAt('/admin/people', admin)
    // Wait for the households themselves: the button is there while they load, and correctly
    // refuses to save a list it has not got yet.
    await screen.findAllByRole('table')
    expect(await screen.findByRole('button', { name: 'Save the list' })).toBeEnabled()
    // The promise on the page has to match what committeeCsv actually does.
    expect(screen.getByText(/no children’s names, no notes about anybody, and no sign-in addresses/)).toBeInTheDocument()
  })

  it('will not erase a household on one click', async () => {
    renderAt('/admin/people', admin)
    const [, table] = await screen.findAllByRole('table')
    await userEvent.click(within(table).getByRole('row', { name: /The Sens/ }).querySelector('button')!)

    await userEvent.click(await screen.findByRole('button', { name: 'Remove this household' }))
    // The confirm stays shut until the name is typed, so this cannot go to a misclick.
    expect(screen.getByRole('button', { name: 'Remove permanently' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/Type .* to confirm/), 'The Sens')
    expect(screen.getByRole('button', { name: 'Remove permanently' })).toBeEnabled()
  })

  it('offers the copy in the same place, before anything is erased', async () => {
    renderAt('/admin/people', admin)
    const [, table] = await screen.findAllByRole('table')
    await userEvent.click(within(table).getByRole('row', { name: /The Sens/ }).querySelector('button')!)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove this household' }))

    // "You should have taken a copy first" is a poor thing to say afterwards.
    expect(screen.getByText(/Take a copy first/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Show me everything you hold/ })).toBeInTheDocument()
  })

  it('erases the household, and it leaves the list', async () => {
    renderAt('/admin/people', admin)
    const [, table] = await screen.findAllByRole('table')
    await userEvent.click(within(table).getByRole('row', { name: /The Sens/ }).querySelector('button')!)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove this household' }))
    await userEvent.type(screen.getByLabelText(/Type .* to confirm/), 'The Sens')
    await userEvent.click(screen.getByRole('button', { name: 'Remove permanently' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument()
    const [, after] = await screen.findAllByRole('table')
    expect(within(after).queryByRole('row', { name: /The Sens/ })).not.toBeInTheDocument()
  })

  it('does not offer to erase the committee member doing the looking', async () => {
    renderAt('/admin/people', admin)
    const [, table] = await screen.findAllByRole('table')
    const own = within(table).getByRole('row', { name: /The Chatterjees/ })
    await userEvent.click(own.querySelector('button')!)

    await screen.findByLabelText('Household name')
    expect(screen.queryByRole('button', { name: 'Remove this household' })).not.toBeInTheDocument()
  })

  it('opens a household from the list and changes its role', async () => {
    renderAt('/admin/people', admin)
    const [, table] = await screen.findAllByRole('table')
    const row = within(table).getByRole('row', { name: /The Sens/ })
    await userEvent.click(within(row).getByRole('button', { name: /Edit/ }))

    await userEvent.selectOptions(await screen.findByLabelText('Role'), 'admin')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    const [, after] = await screen.findAllByRole('table')
    const updated = within(after).getByRole('row', { name: /The Sens/ })
    expect(within(updated).getByText('Admin')).toBeInTheDocument()
  })
})

describe('somebody knocking', () => {
  it('turns a knock into an invitation, without retyping what Google told us', async () => {
    renderAt('/admin/people', admin)
    await userEvent.click(await screen.findByRole('button', { name: /Add household for priya.dutta@gmail.com/ }))

    // Retyping an address we were already given is how addresses get mistyped — and a mistyped
    // sign-in address is somebody locked out for a reason nobody can guess.
    expect(await screen.findByLabelText(/Google address/)).toHaveValue('priya.dutta@gmail.com')
    expect(screen.getByLabelText('Who the committee speaks to')).toHaveValue('Priya Dutta')
    expect(screen.getByLabelText('Name')).toHaveValue('Priya Dutta')
  })

  it('takes a knock off the list once it has been dealt with', async () => {
    renderAt('/admin/people', admin)
    expect(await screen.findByText('amit.bose@gmail.com')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Ignore amit.bose@gmail.com/ }))

    await waitFor(() => expect(screen.queryByText('amit.bose@gmail.com')).not.toBeInTheDocument())
    // The other one is untouched.
    expect(screen.getByText('priya.dutta@gmail.com')).toBeInTheDocument()
  })
})

describe('preview sign-in', () => {
  it('is offered when asked for by name, and gets you in', async () => {
    const router = renderAt('/login?preview')
    const account = await screen.findByRole('button', { name: /Debashis Chatterjee/ })
    await userEvent.click(account)
    expect(router.state.location.pathname).toBe('/admin')
    expect(await screen.findByRole('heading', { level: 1, name: 'Committee overview' })).toBeInTheDocument()
  })

  it('is not offered to an ordinary visitor', async () => {
    renderAt('/login')
    await screen.findByRole('heading', { level: 1, name: 'Member sign-in' })
    expect(screen.queryByRole('heading', { name: 'Walk through the portal' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled()
  })
})
