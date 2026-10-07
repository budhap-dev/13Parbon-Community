import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { blankEvent, previewOfDraft } from '@/domain/event'
import { EventPreviewPage } from '@/features/events/EventPreviewPage'
import { previewMessage } from '@/features/events/previewChannel'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestProviders, TestDataProviders } from '@/test/render'

const admin = previewAccounts[1]

const draft = {
  ...blankEvent(),
  title: 'Boishakhi 2027',
  summary: 'Welcome everyone!',
  startsAt: '2027-04-17T18:00:00.000Z',
  venue: 'St Andrew’s Community Hall',
  coverImageUrl: 'https://photos.13parbon.org.uk/full/boishakhi-2026-03.jpg',
  coverAnimation: 'colour' as const,
}

/** A message as this site's own designer would send it. */
const fromDesigner = (data: unknown, origin = window.location.origin) =>
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }))
  })

describe('the draft, shaped for the preview', () => {
  it('is shaped the way a save is, with a photograph chosen on this machine standing in for one not yet uploaded', () => {
    const event = previewOfDraft({ ...draft, coverImageUrl: '', venueAddress: '  ' }, 'blob:local-photo')
    expect(event).toMatchObject({ title: 'Boishakhi 2027', coverImageUrl: 'blob:local-photo', coverAnimation: 'colour' })
    expect(event.venueAddress).toBeUndefined()
  })

  it('prefers the address in the bucket to the photograph on this machine', () => {
    expect(previewOfDraft(draft, 'blob:local-photo').coverImageUrl).toBe(draft.coverImageUrl)
  })
})

describe('the preview frame', () => {
  it('says where it comes from when somebody lands on it', () => {
    render(
      <TestProviders>
        <EventPreviewPage />
      </TestProviders>,
    )
    expect(screen.getByText(/Open it from there/)).toBeInTheDocument()
  })

  it('draws the evening the designer sends, on the real page', async () => {
    render(
      <TestProviders>
        <EventPreviewPage />
      </TestProviders>,
    )
    await fromDesigner(previewMessage({ type: 'show', event: previewOfDraft(draft), replay: 0 }))
    expect(screen.getByRole('heading', { level: 1, name: 'Boishakhi 2027' })).toBeInTheDocument()
    expect(screen.getByText('Welcome everyone!')).toBeInTheDocument()
  })

  it('ignores anything that is not this site’s own designer', async () => {
    render(
      <TestProviders>
        <EventPreviewPage />
      </TestProviders>,
    )
    await fromDesigner(previewMessage({ type: 'show', event: previewOfDraft(draft), replay: 0 }), 'https://elsewhere.example')
    await fromDesigner({ type: 'show', event: previewOfDraft(draft), replay: 0 })
    expect(screen.queryByRole('heading', { name: 'Boishakhi 2027' })).not.toBeInTheDocument()
  })

  it('draws the cover afresh on "Play again", so its movement starts over', async () => {
    render(
      <TestProviders>
        <EventPreviewPage />
      </TestProviders>,
    )
    await fromDesigner(previewMessage({ type: 'show', event: previewOfDraft(draft), replay: 0 }))
    const first = document.querySelector('img')
    await fromDesigner(previewMessage({ type: 'show', event: previewOfDraft(draft), replay: 1 }))
    expect(document.querySelector('img')).not.toBe(first)
  })
})

describe('previewing from the event designer', () => {
  async function openDesigner() {
    render(
      <TestDataProviders session={admin}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/events'] })} />
      </TestDataProviders>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))
    fireEvent.change(screen.getByLabelText('What it is called'), { target: { value: draft.title } })
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2027-04-17T18:00' } })
  }

  it('waits for a name and a start time before it can show the page', async () => {
    render(
      <TestDataProviders session={admin}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/events'] })} />
      </TestDataProviders>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'New event' }))
    expect(screen.getByRole('button', { name: 'Preview the page' })).toBeDisabled()
    expect(screen.getByText('Give it a name and a start time to preview the whole page.')).toBeInTheDocument()
  })

  it('opens the page full screen in a frame, and Escape puts it away with the draft untouched', async () => {
    await openDesigner()
    await userEvent.click(screen.getByRole('button', { name: 'Preview the page' }))

    const dialog = screen.getByRole('dialog', { name: 'How the page will look' })
    expect(within(dialog).getByTitle('Preview of the page for Boishakhi 2027')).toHaveAttribute('src', '/preview/event')
    expect(within(dialog).getByRole('button', { name: 'Close the preview' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('What it is called')).toHaveValue('Boishakhi 2027')
  })

  it('closes when Escape is pressed inside the frame, which tells it so', async () => {
    await openDesigner()
    await userEvent.click(screen.getByRole('button', { name: 'Preview the page' }))
    await fromDesigner(previewMessage({ type: 'close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers "Play again" for a cover that moves, and says why it may not move at all', async () => {
    // The test browser has no matchMedia; this one says reduced motion is on.
    window.matchMedia = vi.fn(
      (query: string) =>
        ({ matches: query.includes('reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
    )
    await openDesigner()
    expect(screen.queryByRole('button', { name: '▶ Play again' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Cover photograph'), { target: { value: draft.coverImageUrl } })
    await userEvent.selectOptions(screen.getByLabelText('How it moves'), 'Into colour')

    expect(screen.getByRole('button', { name: '▶ Play again' })).toBeInTheDocument()
    expect(screen.getByText(/set to reduce motion/)).toBeInTheDocument()
    Reflect.deleteProperty(window, 'matchMedia')
  })
})
