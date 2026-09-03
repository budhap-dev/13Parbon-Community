import { render, screen } from '@testing-library/react'
import { NotConnected } from './NotConnected'

describe('NotConnected', () => {
  it('says what is not ready and offers the social channels while the email is a placeholder', () => {
    render(<NotConnected action="send a message" email="[hello@example.org]" />)
    expect(screen.getByRole('heading', { name: 'Not quite ready to send a message here' })).toBeInTheDocument()
    expect(screen.getByText(/rather tell you than take your details/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument()
  })

  it('offers the address once the committee has filled one in', () => {
    render(<NotConnected action="send a message" email="hello@13parbon.org" />)
    expect(screen.getByRole('link', { name: 'hello@13parbon.org' })).toHaveAttribute(
      'href',
      'mailto:hello@13parbon.org',
    )
  })
})
