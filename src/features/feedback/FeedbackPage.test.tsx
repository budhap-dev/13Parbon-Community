import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { defaultSettings } from '@/app/defaults'
import { createMockApi, type ApiClient } from '@/lib/api'
import { TestDataProviders } from '@/test/render'

/** The page is behind a switch that starts off, so every test here turns it on first. */
function withFeedbackOn(over: Partial<ApiClient> = {}): ApiClient {
  const base = createMockApi()
  return {
    ...base,
    delivers: true,
    settings: { ...base.settings, get: async () => ({ ...defaultSettings, showFeedback: true }) },
    ...over,
  }
}

function renderPage(api: ApiClient) {
  render(
    <TestDataProviders api={api}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/feedback'] })} />
    </TestDataProviders>,
  )
}

describe('leaving feedback', () => {
  it('says the committee reads it first, before the box rather than after', async () => {
    renderPage(withFeedbackOn())
    await screen.findByRole('heading', { level: 1, name: 'What people say' })
    // Somebody typing a complaint should know where it is going before they type it.
    expect(await screen.findByText(/reads everything before any of it appears/i)).toBeInTheDocument()
  })

  it('will not send a couple of words', async () => {
    const send = vi.fn()
    const base = createMockApi()
    renderPage(withFeedbackOn({ feedback: { ...base.feedback, send } }))

    await userEvent.type(await screen.findByLabelText(/what would you like to tell us/i), 'good')
    await userEvent.click(screen.getByRole('button', { name: /Send/ }))

    expect(await screen.findByText(/a little more/i)).toBeInTheDocument()
    expect(send).not.toHaveBeenCalled()
  })

  it('sends it anonymously when nobody is signed in, and says so', async () => {
    const base = createMockApi()
    const send = vi.fn(base.feedback.send)
    renderPage(withFeedbackOn({ feedback: { ...base.feedback, send } }))

    await userEvent.type(
      await screen.findByLabelText(/what would you like to tell us/i),
      'The hall was warm and the singing went on far too long, in the best way.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send anonymously' }))

    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ signed: false })))
    expect(await screen.findByRole('heading', { name: 'Thank you.' })).toBeInTheDocument()
    expect(screen.getByText(/it is anonymous/i)).toBeInTheDocument()
  })

  /**
   * The thank-you screen has to be honest about what will happen next. A form that says
   * "thank you, it is live" and then shows nothing on the page is a form people report as
   * broken — and one that says nothing at all leaves them refreshing.
   */
  it('warns that it may not go up at all', async () => {
    renderPage(withFeedbackOn())
    await userEvent.type(
      await screen.findByLabelText(/what would you like to tell us/i),
      'Please keep the food stalls, the queue is half the fun of it.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send anonymously' }))
    expect(await screen.findByText(/may decide not to put it up/i)).toBeInTheDocument()
  })

  /**
   * The box has to come back empty. Somebody who has just been thanked for one note and wants
   * to add another should not have to clear the first one out of the way — and worse, a box
   * still holding what they sent invites them to send it twice.
   */
  it('gives an empty box back when they want to add another', async () => {
    renderPage(withFeedbackOn())
    const box = await screen.findByLabelText(/what would you like to tell us/i)
    await userEvent.type(box, 'The children’s programme was the best part of the evening.')
    await userEvent.click(screen.getByRole('button', { name: 'Send anonymously' }))

    await screen.findByRole('heading', { name: 'Thank you.' })
    await userEvent.click(screen.getByRole('button', { name: 'Say something else' }))

    const again = await screen.findByLabelText(/what would you like to tell us/i)
    expect(again).toHaveValue('')
  })

  it('offers the email address instead when nothing is wired up', async () => {
    const base = createMockApi()
    renderPage({
      ...base,
      delivers: false,
      settings: { ...base.settings, get: async () => ({ ...defaultSettings, showFeedback: true }) },
    })
    await screen.findByRole('heading', { level: 1, name: 'What people say' })
    expect(await screen.findByText(/not switched on yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send/ })).not.toBeInTheDocument()
  })
})

describe('what the committee has approved', () => {
  it('shows an approved note, by name and date and nothing else', async () => {
    renderPage(withFeedbackOn())
    // From the fixtures: signed by Meera, and on the website.
    expect(await screen.findByText(/left with our daughter in the dance line/i)).toBeInTheDocument()
    // In full: two people called Meera are two people.
    expect(screen.getByText('Meera Ghosh')).toBeInTheDocument()
  })

  it('shows nothing that is still waiting or was turned down', async () => {
    renderPage(withFeedbackOn())
    await screen.findByText(/left with our daughter in the dance line/i)
    // Waiting, and one that was turned down. Neither belongs on a public page.
    expect(screen.queryByText(/the hall gets very cold/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/testing testing/i)).not.toBeInTheDocument()
  })

  it('says so plainly when there is nothing up yet', async () => {
    const base = createMockApi()
    renderPage(withFeedbackOn({ feedback: { ...base.feedback, listApproved: async () => [] } }))
    expect(await screen.findByText(/Yours could be the first/i)).toBeInTheDocument()
  })

  it('says it could not load them, rather than that there are none, when the list fails', async () => {
    const base = createMockApi()
    renderPage(
      withFeedbackOn({
        feedback: {
          ...base.feedback,
          listApproved: async () => {
            throw new Error('down')
          },
        },
      }),
    )
    expect(await screen.findByText(/could not load what people have told us/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText(/Yours could be the first/i)).not.toBeInTheDocument()
  })
})
