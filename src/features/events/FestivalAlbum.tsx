import { Link } from 'react-router'
import { site } from '@/app/site'
import type { Festival } from '@/domain/festival'
import { useAlbums } from '@/lib/api'
import styles from './Events.module.css'

/**
 * An occasion with no date on the calendar yet is a dead end: the page says to come back
 * later and offers nothing to look at. If we have photographs from the last one, they are
 * the answer to what somebody arriving here actually wants to know — what this evening is
 * like. Nothing is shown when there is no album, or while the gallery is switched off.
 */
export function FestivalAlbum({ festival }: { festival: Festival }) {
  const { data: albums } = useAlbums()
  // Albums arrive newest first, so the first match is the most recent time we held this.
  const album = albums?.find((a) => a.festivalId === festival.id)
  if (!site.showPhotos || !album) return null

  return (
    <Link to={`/gallery/${album.slug}`} className={styles.albumLink}>
      {album.cover ? <img src={album.cover.thumbnailUrl} alt="" className={styles.albumCover} loading="lazy" /> : null}
      <span className={styles.albumText}>
        <span className={styles.albumTitle}>Photos from {album.title}</span>
        <span className={styles.albumMeta}>
          {album.media.length} {album.media.length === 1 ? 'photo' : 'photos'}
        </span>
      </span>
    </Link>
  )
}
