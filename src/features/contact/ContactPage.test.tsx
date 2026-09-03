import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { ContactPage } from './ContactPage'

describe('ContactPage', () => {
  it('validates before sending and shows field errors', async () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    expect(document.title).toBe('Contact us · 13Parbon Community')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(screen.getByText('Tell us your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter an email address we can reply to.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toHaveAttribute('aria-invalid', 'true')
    await userEvent.type(screen.getByLabelText('Your name'), 'Rina')
    expect(screen.queryByText('Tell us your name.')).not.toBeInTheDocument()
  })

  it('sends a valid message and thanks the sender', async () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
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

  it('shows where to find us and the social channels', () => {
    renderWithProviders(<ContactPage />, { route: '/contact' })
    expect(screen.getByRole('region', { name: 'Find us' })).toHaveTextContent('[Venue]')
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument()
  })
})
