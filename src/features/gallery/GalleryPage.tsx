import { Link } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import { LoadFailed } from '@/components/LoadFailed'
import { formatMonthYear } from '@/domain/dates'
import { useAlbums } from '@/lib/api'
import styles from './Gallery.module.css'

export function GalleryPage() {
  useDocumentTitle('Gallery')
  const { data: albums, isPending, isError, refetch } = useAlbums()

  return (
    <Container className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Gallery</h1>
        <p className={styles.intro}>Photos from past events, organised by occasion and year. Memories that used to live on one phone.</p>
      </header>
      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : isError ? (
        <LoadFailed what="the albums" onRetry={() => void refetch()} />
      ) : !albums || albums.length === 0 ? (
        <p className={styles.empty}>No albums yet. The first one goes up after the next event.</p>
      ) : (
        <ul className={styles.albums}>
          {albums.map((album) => (
            <li key={album.id} className={styles.album}>
              <div className={styles.albumCover}>
                {album.cover ? <img src={album.cover.thumbnailUrl} alt="" loading="lazy" /> : null}
              </div>
              <h2 className={styles.albumTitle}>
                <Link to={`/gallery/${album.slug}`} className={styles.albumLink}>
                  {album.title}
                </Link>
              </h2>
              <p className={styles.albumMeta}>
                {formatMonthYear(album.publishedAt)} · {album.media.length} {album.media.length === 1 ? 'photo' : 'photos'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
