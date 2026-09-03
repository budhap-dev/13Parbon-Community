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
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument()
  })
})
