import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { createDeliveringApi, renderWithProviders } from '@/test/render'
import { EventPage } from './EventPage'

function renderEvent(slug: string, api?: ReturnType<typeof createDeliveringApi>) {
  return renderWithProviders(
    <Routes>
      <Route path="/events/:slug" element={<EventPage />} />
    </Routes>,
    { route: `/events/${slug}`, api },
  )
}

describe('EventPage', () => {
  it('shows the event, its countdown, registration and volunteer roles', async () => {
    renderEvent('mahalaya-cultural-programme-2026')
    expect(await screen.findByRole('heading', { level: 1, name: 'Cultural programme' })).toBeInTheDocument()
    expect(screen.getByText(/Saturday 10 October, 5:00 pm to 9:30 pm/)).toBeInTheDocument()
    expect(screen.getByText('37 days to go')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Register the family' })).toHaveAttribute('href', '#register')
    const help = screen.getByRole('region', { name: 'A Festival is Best Shared' })
    expect(within(help).getByText(/We warmly welcome volunteers/)).toBeInTheDocument()
    expect(within(help).getByText(/please indicate this when registering/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Take a slot' })).not.toBeInTheDocument()
    expect(document.title).toBe('Cultural programme · 13Parbon Community')
  })

  it('hides registration and the countdown for past events', async () => {
    renderEvent('poila-boishakh-cultural-programme-2026')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Poila Boishakh cultural programme')
    expect(screen.queryByRole('link', { name: 'Register the family' })).not.toBeInTheDocument()
    expect(screen.queryByText(/days to go/)).not.toBeInTheDocument()
    expect(screen.getByText('40 households')).toBeInTheDocument()
    expect(screen.getByText('came')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'A Festival is Best Shared' })).not.toBeInTheDocument()
  })

  it('shows not found for an unknown or unlisted event', async () => {
    renderEvent('committee-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('says plainly that it cannot take a registration when nothing is connected', async () => {
    renderEvent('mahalaya-cultural-programme-2026')
    await screen.findByRole('heading', { level: 1, name: 'Cultural programme' })
    expect(screen.getByRole('heading', { name: 'Not quite ready to register here' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'We’re coming' })).not.toBeInTheDocument()
  })

  it('takes a registration without an account, and confirms it', async () => {
    renderEvent('mahalaya-cultural-programme-2026', createDeliveringApi())
    await screen.findByRole('form', { name: 'Register for Cultural programme' })
    expect(screen.getByText(/do not need an account/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Family or household name'), 'The Duttas')
    await userEvent.type(screen.getByLabelText('Email'), 'priya@example.com')
    await userEvent.clear(screen.getByLabelText('Children'))
    await userEvent.type(screen.getByLabelText('Children'), '2')
    await userEvent.type(screen.getByLabelText(/Could you lend a hand/), 'Cooking')
    await userEvent.click(screen.getByRole('button', { name: 'We’re coming' }))

    expect(await screen.findByRole('heading', { name: 'See you there, The Duttas.' })).toBeInTheDocument()
    expect(screen.getByText(/4 people down for Cultural programme/)).toBeInTheDocument()
    expect(screen.getByText(/confirmation is on its way to priya@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/Thank you for offering to help/)).toBeInTheDocument()
  })

  it('will not send an incomplete registration', async () => {
    renderEvent('mahalaya-cultural-programme-2026', createDeliveringApi())
    await screen.findByRole('form', { name: /Register for/ })
    await userEvent.click(screen.getByRole('button', { name: 'We’re coming' }))
    expect(screen.getByText('Tell us the family name to expect.')).toBeInTheDocument()
    expect(screen.getByText('Enter an email address so we can confirm.')).toBeInTheDocument()
    expect(screen.getByLabelText('Family or household name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('heading', { name: /See you there/ })).not.toBeInTheDocument()
  })

  it('offers no form once registration has closed', async () => {
    renderEvent('holi-2027', createDeliveringApi())
    await screen.findByRole('heading', { level: 1, name: 'Holi' })
    expect(screen.queryByRole('form', { name: /Register for/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Register the family' })).not.toBeInTheDocument()
  })
})
