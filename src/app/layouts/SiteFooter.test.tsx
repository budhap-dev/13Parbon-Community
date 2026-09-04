import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { SiteFooter } from './SiteFooter'

describe('SiteFooter', () => {
  it('shows the community name, footer links and social channels', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    )
    expect(screen.getByText(/13Parbon Community/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    const facebook = screen.getByRole('link', { name: 'Facebook' })
    expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/groups/1337437436797813/')
    expect(facebook).toHaveAttribute('target', '_blank')
    // Channels the community does not have, or has not given an address for, are left out.
    expect(screen.queryByRole('link', { name: 'Instagram' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument()
  })
})
