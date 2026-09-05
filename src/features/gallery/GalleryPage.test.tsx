import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '@/test/render'
import { AlbumPage } from './AlbumPage'
import { GalleryPage } from './GalleryPage'

describe('GalleryPage', () => {
  it('lists public albums newest first with covers and counts', async () => {
    renderWithProviders(<GalleryPage />, { route: '/gallery' })
    const titles = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)
    expect(titles).toEqual(['Boishakhi 2026', 'Holi 2026', 'Saraswati Puja 2026', 'Mahalaya 2025'])
    expect(screen.getByRole('link', { name: 'Holi 2026' })).toHaveAttribute('href', '/gallery/holi-2026')
    expect(screen.getByText('April 2026 · 2 photos')).toBeInTheDocument()
    expect(screen.getByText('March 2026 · 1 photo')).toBeInTheDocument()
    expect(document.title).toBe('Gallery · 13Parbon Community')
  })
})

describe('AlbumPage', () => {
  function renderAlbum(slug: string) {
    return renderWithProviders(
      <Routes>
        <Route path="/gallery/:slug" element={<AlbumPage />} />
      </Routes>,
      { route: `/gallery/${slug}` },
    )
  }

  it('shows the album photos and opens them in the lightbox', async () => {
    renderAlbum('boishakhi-2026')
    expect(await screen.findByRole('heading', { level: 1, name: 'Boishakhi 2026' })).toBeInTheDocument()
    expect(screen.getByText('Our Boishakh evening at St Andrew’s Community Hall, April 2026.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open photo: The kids take the stage' }))
    expect(screen.getByRole('dialog', { name: 'Photo: The kids take the stage' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('dialog', { name: 'Photo: Rabindrasangeet at the Boishakhi programme' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.title).toBe('Boishakhi 2026 · 13Parbon Community')
  })

  it('shows not found for a members-only or unknown album', async () => {
    renderAlbum('committee-dinner')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})
