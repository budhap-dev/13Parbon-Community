import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import { Lightbox } from '@/components/Lightbox'
import { NotFoundPage } from '@/features/placeholder'
import { useAlbum } from '@/lib/api'
import styles from './Gallery.module.css'

export function AlbumPage() {
  const { slug = '' } = useParams()
  const { data: album, isPending } = useAlbum(slug)
  const [open, setOpen] = useState<number | null>(null)
  useDocumentTitle(album?.title)

  if (isPending) {
    return (
      <Container className={styles.page}>
        <p aria-busy="true">Loading…</p>
      </Container>
    )
  }
  if (!album) return <NotFoundPage />

  const photos = album.media.filter((m) => m.type === 'photo')
  const items = photos.map((m) => ({ id: m.id, src: m.url, alt: m.caption ?? 'Community photo', caption: m.caption }))

  return (
    <Container className={styles.page}>
      <header className={styles.head}>
        <Link to="/gallery" className={styles.crumb}>
          ← All albums
        </Link>
        <h1 className={styles.title}>{album.title}</h1>
        {album.description ? <p className={styles.meta}>{album.description}</p> : null}
      </header>
      {photos.length === 0 ? (
        <p className={styles.empty}>No photos in this album yet.</p>
      ) : (
        <ul className={styles.photos}>
          {photos.map((photo, i) => (
            <li key={photo.id}>
              <button type="button" className={styles.photo} onClick={() => setOpen(i)} aria-label={`Open photo: ${photo.caption ?? `photo ${i + 1}`}`}>
                <img src={photo.thumbnailUrl} alt={photo.caption ?? ''} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Lightbox items={items} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
    </Container>
  )
}
