import { render, screen } from '@testing-library/react'
import { NotConnected } from './NotConnected'

describe('NotConnected', () => {
  it('says what is not ready and offers the social channels while the email is a placeholder', () => {
    render(<NotConnected action="send a message" />)
    expect(screen.getByRole('heading', { name: 'Not quite ready to send a message here' })).toBeInTheDocument()
    expect(screen.getByText(/rather tell you than take your details/)).toBeInTheDocument()
    // Both channels are named; only the one with an address is a link.
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://www.facebook.com/groups/1337437436797813/',
    )
    expect(screen.getByText(/reach us on/)).toHaveTextContent('Facebook and our WhatsApp group')
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
  })
})
