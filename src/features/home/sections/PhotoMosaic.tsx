import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import { useRecentMedia } from '@/lib/api'
import styles from '../Home.module.css'

/** Five recent photos in a mosaic: one large, four small. The public face of the community year. */
export function PhotoMosaic() {
  const { data: media } = useRecentMedia(5)
  const photos = media?.filter((m) => m.type === 'photo') ?? []
  if (photos.length === 0) return null

  return (
    <Container>
      <section className={styles.mosaicSection} aria-labelledby="moments-title">
        <SectionHeading id="moments-title" title="Moments from our year" action={{ label: 'All albums', to: '/gallery' }} />
        <ul className={styles.mosaic}>
          {photos.map((photo, i) => (
            <li key={photo.id} className={i === 0 ? styles.mosaicLead : styles.mosaicTile}>
              <figure className={styles.mosaicFigure}>
                <img src={photo.url} alt={photo.caption ? '' : 'Community photo'} loading={i === 0 ? 'eager' : 'lazy'} className={styles.mosaicImage} />
                {photo.caption ? <figcaption className={styles.mosaicCaption}>{photo.caption}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  )
}
