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
    expect(titles).toEqual(['Boishakhi 2026', 'Saraswati Puja 2026'])
    expect(screen.getByRole('link', { name: 'Saraswati Puja 2026' })).toHaveAttribute('href', '/gallery/saraswati-puja-2026')
    expect(screen.getByText('April 2026 · 19 photos')).toBeInTheDocument()
    expect(screen.getByText('February 2026 · 22 photos')).toBeInTheDocument()
    expect(document.title).toBe('Gallery · 13Parbon Community')
  })

  it('says the albums are still going up, so two of them do not read as all there is', async () => {
    renderWithProviders(<GalleryPage />, { route: '/gallery' })
    await screen.findAllByRole('heading', { level: 2 })
    expect(screen.getByText(/only just started putting these up/)).toBeInTheDocument()
  })

  /**
   * The privacy page makes the promise; this is the page where somebody discovers they are in
   * a photograph. If the way to object is only a page away, it may as well not be there.
   */
  it('says how to have a photograph taken down, and links to the way to ask', async () => {
    renderWithProviders(<GalleryPage />, { route: '/gallery' })
    await screen.findAllByRole('heading', { level: 2 })
    expect(screen.getByText(/rather not be/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'tell us' })).toHaveAttribute('href', '/contact')
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
    // These have no captions yet, so the label falls back to the photo's place in the album.
    await userEvent.click(screen.getByRole('button', { name: 'Open photo: photo 2' }))
    expect(screen.getByRole('dialog', { name: 'Photo 2 of 19' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('dialog', { name: 'Photo 1 of 19' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.title).toBe('Boishakhi 2026 · 13Parbon Community')
  })

  it('repeats the takedown offer beside the photographs themselves', async () => {
    renderAlbum('saraswati-puja-2026')
    await screen.findByRole('heading', { level: 1, name: 'Saraswati Puja 2026' })
    expect(screen.getByRole('link', { name: 'tell us' })).toHaveAttribute('href', '/contact')
  })

  it('shows not found for a members-only or unknown album', async () => {
    renderAlbum('committee-dinner')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})
