import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createFailingApi, renderWithProviders } from '@/test/render'
import { EventsPage } from '@/features/events/EventsPage'
import { EventPage } from '@/features/events/EventPage'
import { Route, Routes } from 'react-router'

describe('when the data does not arrive', () => {
  it('tells the viewer instead of loading for ever, and offers another go', async () => {
    renderWithProviders(<EventsPage />, { route: '/events', api: createFailingApi() })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('We could not load the calendar just now.')
    // The loading state must be gone: waiting on something that is never coming is the bug.
    expect(screen.queryByText('Loading the calendar…')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  })

  it('does not pass off an unreachable event as one that does not exist', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/events/:slug" element={<EventPage />} />
      </Routes>,
      { route: '/events/mahalaya-cultural-programme-2026', api: createFailingApi() },
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load this event just now.')
    expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
  })
})
