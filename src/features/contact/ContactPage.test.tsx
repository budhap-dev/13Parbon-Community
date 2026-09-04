import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createDeliveringTestApi, renderWithProviders } from '@/test/render'
import { ContactPage } from './ContactPage'

describe('ContactPage', () => {
  it('validates before sending and shows field errors', async () => {
    renderWithProviders(<ContactPage />, { route: '/contact', api: createDeliveringTestApi() })
    expect(document.title).toBe('Contact us · 13Parbon Community')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(screen.getByText('Tell us your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter an email address we can reply to.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toHaveAttribute('aria-invalid', 'true')
    await userEvent.type(screen.getByLabelText('Your name'), 'Rina')
    expect(screen.queryByText('Tell us your name.')).not.toBeInTheDocument()
  })

  it('sends a valid message and thanks the sender', async () => {
    renderWithProviders(<ContactPage />, { route: '/contact', api: createDeliveringTestApi() })
    await userEvent.type(screen.getByLabelText('Your name'), 'Rina Sen')
    await userEvent.type(screen.getByLabelText('Email'), 'rina@example.com')
    await userEvent.type(screen.getByLabelText('Subject'), 'Parking')
    await userEvent.type(screen.getByLabelText('Message'), 'Where do we park on the night of the programme?')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('heading', { name: 'Thank you, Rina.' })).toBeInTheDocument()
    expect(screen.getByText(/reply to rina@example.com/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send another' }))
    expect(screen.getByLabelText('Your name')).toHaveValue('')
  })

  it('shows where to find us and the social channels', async () => {
    renderWithProviders(<ContactPage />, { route: '/contact', api: createDeliveringTestApi() })
    // Wait for the event itself, not just the panel: the panel renders before it arrives.
    await screen.findByText('Cultural programme')
    const findUs = screen.getByRole('region', { name: 'Where to find us' })
    // No office and no opening hours: the next gathering is the answer.
    expect(findUs).toHaveTextContent('We have no office and no opening hours')
    expect(findUs).toHaveTextContent('Saturday 10 October at 1:30 pm')
    // The venue comes from the event, not from the site config: tests carry their own calendar.
    expect(findUs).toHaveTextContent('The hall')
    expect(within(findUs).getByRole('link', { name: 'What is happening that day' })).toHaveAttribute(
      'href',
      '/events/mahalaya-cultural-programme-2026',
    )
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/groups/1337437436797813/')
  })

  it('offers another way through when submissions have nowhere to go', () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Not quite ready to send a message/ })).toBeInTheDocument()
  })

  it('does not link an email address that has not been published yet', async () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    const findUs = await screen.findByRole('region', { name: 'Where to find us' })
    // An address nobody has published is not shown at all, never mind linked.
    expect(findUs).not.toHaveTextContent('[hello@example.org]')
    expect(findUs.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(findUs).toHaveTextContent('the fastest way to reach us is the form on this page')
  })

  it('shows the venue on a map, and offers directions', async () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    const findUs = await screen.findByRole('region', { name: 'Where to find us' })
    const map = findUs.querySelector('iframe')
    expect(map).toHaveAttribute('title', 'Map showing St Andrew’s Community Hall, Morley, Leeds, LS27 0JU')
    expect(map?.getAttribute('src')).toContain('openstreetmap.org')
    expect(map?.getAttribute('src')).toContain('marker=53.7397,-1.6156')
    const directions = within(findUs).getByRole('link', { name: /Get directions/ })
    expect(directions).toHaveAttribute('target', '_blank')
    expect(directions.getAttribute('href')).toContain('LS27%200JU')
  })
})
