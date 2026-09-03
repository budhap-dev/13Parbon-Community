import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '@/test/render'
import { ArticlePage } from './ArticlePage'

function renderArticle(slug: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/news/:slug" element={<ArticlePage />} />
    </Routes>,
    { route: `/news/${slug}` },
  )
}

describe('ArticlePage', () => {
  it('renders the article with its paragraphs and metadata', async () => {
    renderArticle('saraswati-puja-2026-thank-you')
    expect(await screen.findByRole('heading', { level: 1, name: 'Saraswati Puja 2026: thank you' })).toBeInTheDocument()
    expect(screen.getByText('Saturday 14 February')).toBeInTheDocument()
    expect(screen.getByText('Photos are in the gallery.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← All news' })).toHaveAttribute('href', '/news')
    expect(document.title).toBe('Saraswati Puja 2026: thank you · 13Parbon Community')
  })

  it('shows not found for an unknown slug', async () => {
    renderArticle('nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})
