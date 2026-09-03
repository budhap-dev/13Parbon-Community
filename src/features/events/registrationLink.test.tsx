import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { site } from '@/app/site'
import { renderWithProviders } from '@/test/render'
import { EventPage } from './EventPage'

/**
 * Registering happens on a form the committee runs. Pasting its address into the config is
 * the next thing that will happen, so both states are worth proving before it does.
 */
describe('the registration link', () => {
  // Readonly to the app, deliberately writable here so both states can be exercised.
  const config = site as { registrationFormUrl: string | null }
  const original = config.registrationFormUrl
  const form = 'https://docs.google.com/forms/d/e/example/viewform'

  afterEach(() => {
    config.registrationFormUrl = original
  })

  function renderEvent() {
    renderWithProviders(
      <Routes>
        <Route path="/events/:slug" element={<EventPage />} />
      </Routes>,
      { route: '/events/mahalaya-cultural-programme-2026' },
    )
  }

  it('offers the form, in a new tab, once its address is set', async () => {
    config.registrationFormUrl = form
    renderEvent()
    await screen.findByRole('heading', { level: 1, name: 'Cultural programme' })
    const link = screen.getByRole('link', { name: 'Register the family' })
    expect(link).toHaveAttribute('href', form)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
    expect(screen.queryByText(/Registration opens shortly/)).not.toBeInTheDocument()
  })

  it('says registration opens shortly while there is no address', async () => {
    config.registrationFormUrl = null
    renderEvent()
    await screen.findByRole('heading', { level: 1, name: 'Cultural programme' })
    expect(screen.queryByRole('link', { name: 'Register the family' })).not.toBeInTheDocument()
    expect(screen.getByText(/Registration opens shortly/)).toBeInTheDocument()
  })
})
