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

  it('shows the social channels', async () => {
    renderWithProviders(<ContactPage />, { route: '/contact', api: createDeliveringTestApi() })
    // Where we are depends on what we are putting on, so the venue and its map live on the
    // event's own page. This one is only about getting hold of the committee.
    expect(screen.queryByRole('region', { name: 'Where to find us' })).not.toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    const follow = await screen.findByRole('region', { name: 'Follow along' })
    expect(within(follow).getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://www.facebook.com/groups/1337437436797813/',
    )
  })

  it('offers another way through when submissions have nowhere to go', () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Not quite ready to send a message/ })).toBeInTheDocument()
  })

  it('does not show an email address that has not been published yet', () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    // An address nobody has published is not shown at all, never mind linked.
    expect(screen.queryByText(/hello@example.org/)).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
  })
})
