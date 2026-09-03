import { render, screen } from '@testing-library/react'
import { NotConnected } from './NotConnected'

describe('NotConnected', () => {
  it('says what is not ready and offers the social channels while the email is a placeholder', () => {
    render(<NotConnected action="send a message" />)
    expect(screen.getByRole('heading', { name: 'Not quite ready to send a message here' })).toBeInTheDocument()
    expect(screen.getByText(/rather tell you than take your details/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument()
  })
})
