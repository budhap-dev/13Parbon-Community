import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { JoinPage } from './JoinPage'
import { LoginPage } from './LoginPage'

describe('JoinPage', () => {
  it('validates the application before sending', async () => {
    renderWithProviders(<JoinPage />, { route: '/join' })
    expect(document.title).toBe('Join the community · 13Parbon Community')
    await userEvent.click(screen.getByRole('button', { name: 'Apply to join' }))
    expect(screen.getByText('Tell us the family or household name.')).toBeInTheDocument()
    expect(screen.getByText('Who should we write to?')).toBeInTheDocument()
    expect(screen.getByText('Enter an email address we can reply to.')).toBeInTheDocument()
  })

  it('sends a valid application and welcomes the household', async () => {
    renderWithProviders(<JoinPage />, { route: '/join' })
    await userEvent.type(screen.getByLabelText('Family or household name'), 'The Sens')
    await userEvent.type(screen.getByLabelText('Contact name'), 'Rina Sen')
    await userEvent.type(screen.getByLabelText('Email'), 'rina@example.com')
    await userEvent.clear(screen.getByLabelText('Children'))
    await userEvent.type(screen.getByLabelText('Children'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Apply to join' }))
    expect(await screen.findByRole('heading', { name: 'Welcome, The Sens.' })).toBeInTheDocument()
    expect(screen.getByText(/write to rina@example.com/)).toBeInTheDocument()
  })
})

describe('LoginPage', () => {
  it('explains the portal is not open yet and points to join and events', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })
    expect(screen.getByRole('heading', { level: 1, name: 'Member login' })).toBeInTheDocument()
    expect(screen.getByText(/not open yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apply to join' })).toHaveAttribute('href', '/join')
  })
})
