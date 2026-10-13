import { screen } from '@testing-library/react'
import { createEmptyApi, renderWithProviders } from '@/test/render'
import { SiteFooter } from './SiteFooter'

describe('SiteFooter', () => {
  it('shows the community name, footer links and social channels', () => {
    renderWithProviders(<SiteFooter />)
    expect(screen.getByText(/13Parbon Community/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    const facebook = screen.getByRole('link', { name: 'Facebook' })
    expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/groups/1337437436797813/')
    expect(facebook).toHaveAttribute('target', '_blank')
    // Channels the community does not have, or has not given an address for, are left out.
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/13parbon.leeds',
    )
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument()
  })

  it('names no fixed hall, since the evenings move between them', async () => {
    renderWithProviders(<SiteFooter />, { api: createEmptyApi() })
    expect(screen.getByText('Where we meet')).toBeInTheDocument()
    expect(await screen.findByText(/Each evening’s page says where/)).toBeInTheDocument()
    expect(screen.queryByText(/St Andrew’s/)).not.toBeInTheDocument()
  })
})
