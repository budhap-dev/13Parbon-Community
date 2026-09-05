import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { PrivacyPage } from './PrivacyPage'

describe('PrivacyPage', () => {
  it('lists every section of the notice', () => {
    renderWithProviders(<PrivacyPage />, { route: '/privacy' })
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument()
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titles).toEqual(['What we collect', 'Why we use it', 'Cookies and tracking', 'Your name and your photographs', 'Your rights'])
    expect(screen.getByRole('link', { name: 'Contact the committee' })).toHaveAttribute('href', '/contact')
    expect(document.title).toBe('Privacy · 13Parbon Community')
  })

  it('names the controller and links the address it tells people to write to', () => {
    renderWithProviders(<PrivacyPage />, { route: '/privacy' })
    expect(screen.getByText(/Data controller: 13Parbon, Leeds/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '13parbon.Leeds@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:13parbon.Leeds@gmail.com',
    )
    // Nothing left bracketed on a page that now promises to act on requests.
    expect(document.body.textContent).not.toMatch(/\[[^\]]+\]/)
  })
})
