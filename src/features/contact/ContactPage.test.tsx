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

  it('leads with every way through, and says what each one is for', () => {
    renderWithProviders(<ContactPage />, { route: '/contact', api: createDeliveringTestApi() })
    const ways = screen.getByRole('region', { name: 'Ways to reach us' })
    // Email, Facebook, Instagram and the WhatsApp group.
    expect(within(ways).getAllByRole('listitem')).toHaveLength(4)
    expect(within(ways).getByRole('link', { name: '13parbon.Leeds@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:13parbon.Leeds@gmail.com',
    )
    expect(within(ways).getByRole('link', { name: /Open Facebook/ })).toHaveAttribute(
      'href',
      'https://www.facebook.com/groups/1337437436797813/',
    )
    // The group has no invite address, so it is named rather than offered as a dead link.
    expect(within(ways).getByText('No link to give out yet')).toBeInTheDocument()
    expect(within(ways).getByText(/Ask any member to add you/)).toBeInTheDocument()
    // Where we meet depends on what we are putting on, so that lives on the event page.
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('offers another way through when submissions have nowhere to go', () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Talk to us' })).toBeInTheDocument()
  })

  it('offers the committee address when the form cannot send', () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    // The form is the first choice; while it does not deliver, the address is the way through.
    expect(screen.getByRole('link', { name: '13parbon.Leeds@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:13parbon.Leeds@gmail.com',
    )
  })
})
