import { Link } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { Icon } from '@/components/Icon'
import { heldThisYear, type Festival } from '@/domain/festival'
import { photosAwaited } from '@/domain/gallery'
import { useAlbums, usePastEvents } from '@/lib/api'
import { useNow } from '@/lib/clock'
import styles from './Events.module.css'

/**
 * An occasion with no date on the calendar yet is a dead end: the page says to come back
 * later and offers nothing to look at. If we have photographs from the last one, they are
 * the answer to what somebody arriving here actually wants to know — what this evening is
 * like. Nothing is shown when there is no album, or while the gallery is switched off.
 *
 * Just after this year's evening, before its photographs are up, it says they are coming
 * rather than offering last year's as though they were the latest.
 */
export function FestivalAlbum({ festival }: { festival: Festival }) {
  const settings = useSettings()
  const { data: albums } = useAlbums()
  const { data: past } = usePastEvents(10)
  const now = useNow()
  if (!settings.showPhotos || !albums) return null

  const held = heldThisYear(festival.id, past ?? [], now)
  if (held && photosAwaited(festival.id, held.startsAt, albums)) {
    return (
      <p className={styles.albumSoon}>
        <Icon name="image" size={18} /> Photographs from this year’s {festival.name} coming soon.
      </p>
    )
  }

  // Albums arrive newest first, so the first match is the most recent time we held this.
  const album = albums.find((a) => a.festivalId === festival.id)
  if (!album) return null

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
