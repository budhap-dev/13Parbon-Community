import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { PrivacyPage } from './PrivacyPage'

describe('PrivacyPage', () => {
  it('lists every section of the notice', () => {
    renderWithProviders(<PrivacyPage />, { route: '/privacy' })
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument()
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titles).toEqual(['What we collect', 'Why we use it', 'Cookies and tracking', 'Photos', 'Your rights'])
    expect(screen.getByRole('link', { name: 'Contact the committee' })).toHaveAttribute('href', '/contact')
    expect(document.title).toBe('Privacy · 13Parbon Community')
  })
})
