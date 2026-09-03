import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { SiteFooter } from './SiteFooter'

describe('SiteFooter', () => {
  it('shows the community name, footer links and social channels', () => {
    renderWithProviders(<SiteFooter />)
    expect(screen.getByText(/13Parbon Community/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument()
  })
})
