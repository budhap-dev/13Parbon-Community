import { render, screen } from '@testing-library/react'
import { NotConnected } from './NotConnected'

describe('NotConnected', () => {
  it('gives the two ways to reach the committee, and does not dwell on the form', () => {
    render(<NotConnected />)
    expect(screen.getByRole('heading', { name: 'Talk to us' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '13parbon.Leeds@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:13parbon.Leeds@gmail.com',
    )
    expect(screen.getByText(/WhatsApp group/)).toBeInTheDocument()
    // Somebody here wants a way through, not an account of what we have not built.
    expect(screen.queryByText(/Not quite ready/)).not.toBeInTheDocument()
    expect(screen.queryByText(/still setting this up/)).not.toBeInTheDocument()
  })
})
