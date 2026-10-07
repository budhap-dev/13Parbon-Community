import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { createMockApi } from '@/lib/api'
import { testEvents } from '@/test/events'
import { TestDataProviders, TEST_NOW } from '@/test/render'

/** An evening that has been called off, still to come. */
const calledOff = {
  ...testEvents[0],
  id: 'ev-called-off',
  slug: 'called-off',
  title: 'Saraswati Puja 2027',
  venue: 'St Andrew’s Community Hall',
  startsAt: '2026-11-20T18:00:00',
  endsAt: '2026-11-20T22:00:00',
  status: 'cancelled' as const,
  registrationOpen: true,
  registrationUrl: 'https://forms.example.com/book',
  performerFormUrl: 'https://forms.example.com/perform',
}

const events = [...testEvents, calledOff]

function renderAt(path: string) {
  render(
    <TestDataProviders api={createMockApi({ now: () => TEST_NOW, events })}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

describe('an evening that has been called off', () => {
  it('still has a page, rather than answering as though it never existed', async () => {
    // It used to be filtered out of getBySlug, so anybody holding the link learned nothing.
    renderAt('/events/called-off')
    expect(await screen.findByRole('heading', { level: 1, name: 'Saraswati Puja 2027' })).toBeInTheDocument()
  })

  it('says so before anything else, and where not to go', async () => {
    renderAt('/events/called-off')
    // The bold half is its own element, so the whole sentence lives on the paragraph around it.
    const notice = (await screen.findByText(/has been cancelled/)).closest('p')!
    expect(notice).toHaveTextContent(/do not come to St Andrew’s Community Hall/)
    expect(notice).toHaveTextContent(/not going ahead on/)
  })

  it('offers nothing to book, even though booking was left open', async () => {
    renderAt('/events/called-off')
    await screen.findByText(/has been cancelled/)
    expect(screen.queryByRole('link', { name: /Register to come/ })).not.toBeInTheDocument()
  })

  it('does not ask anybody to put their name down for the stage', async () => {
    renderAt('/events/called-off')
    await screen.findByText(/has been cancelled/)
    expect(screen.queryByRole('link', { name: /perform/i })).not.toBeInTheDocument()
  })

  it('stops counting down to it', async () => {
    renderAt('/events/called-off')
    await screen.findByText(/has been cancelled/)
    // A countdown to an evening that is not happening is a small cruelty.
    expect(screen.queryByText(/days? to go|weeks? to go|tomorrow|today/i)).not.toBeInTheDocument()
  })
})

describe('the calendar', () => {
  it('keeps it in the list, marked, rather than quietly dropping it', async () => {
    renderAt('/events')
    const card = (await screen.findByRole('link', { name: 'Saraswati Puja 2027' })).closest('article')!
    // Disappearing is indistinguishable from never having been announced.
    expect(within(card).getByText('Cancelled')).toBeInTheDocument()
  })

  it('does not invite anybody to look forward to it', async () => {
    renderAt('/events')
    const card = (await screen.findByRole('link', { name: 'Saraswati Puja 2027' })).closest('article')!
    expect(within(card).queryByText('Details')).not.toBeInTheDocument()
    expect(within(card).getByText('What happened')).toBeInTheDocument()
  })
})

describe('the next event', () => {
  it('skips it, because the next event means the next one that is happening', async () => {
    renderAt('/')
    // It is the soonest by date, and it must not be what the home page counts down to.
    const heading = await screen.findAllByRole('heading', { level: 2 })
    expect(heading.map((h) => h.textContent)).not.toContain('Saraswati Puja 2027')
  })
})
