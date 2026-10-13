import { useState } from 'react'
import { Link } from 'react-router'
import { Container } from '@/components/Container'
import { Lightbox } from '@/components/Lightbox'
import { SectionHeading } from '@/components/SectionHeading'
import { RemovalNotice } from '@/features/gallery/RemovalNotice'
import { useAlbums, useRecentMedia } from '@/lib/api'
import styles from '../Home.module.css'

/** One large and four small on a wide screen; a phone swipes through the same five. */
const SHOWN = 5

/**
 * Photographs from across the albums, a handful at a time. The set is drawn at random on each
 * visit, so the home page is not the same few faces for as long as one album is the newest.
 *
 * Each tile names its album, and opens full size: these are mixed together here, so the album
 * is the only clue somebody has about where to find more of that evening. Nothing moves on its
 * own — a mosaic on a wide screen, a strip to swipe on a phone — so there is nothing to pause.
 */
export function PhotoStrip() {
  const { data: media } = useRecentMedia(12)
  const { data: albums } = useAlbums()
  const [open, setOpen] = useState<number | null>(null)

  const items =
    media
      ?.filter((item) => item.type === 'photo')
      .slice(0, SHOWN)
      .map((item) => {
        const album = albums?.find((a) => a.id === item.albumId)
        return {
          id: item.id,
          src: item.url,
          alt: item.caption ?? (album ? `Photo from ${album.title}` : 'Community photo'),
          caption: item.caption,
          album: album ? { slug: album.slug, title: album.title } : undefined,
        }
      }) ?? []

  if (items.length === 0) return null

  return (
    <Container>
      <section className={styles.photos} aria-labelledby="moments-title">
        <p lang="bn" className={styles.kickerBn}>
          আমাদের মুহূর্ত
        </p>
        <SectionHeading id="moments-title" title="Moments from our year" action={{ label: 'All albums', to: '/gallery' }} />
        <ul className={styles.mosaic} aria-label="Photographs from our events">
          {items.map((item, i) => (
            <li key={item.id} className={styles.tile}>
              <button
                type="button"
                className={styles.tileOpen}
                onClick={() => setOpen(i)}
                aria-label={`Open photo ${i + 1} of ${items.length} full size`}
              >
                <img className={styles.tileImage} src={item.src} alt={item.alt} loading={i < 2 ? 'eager' : 'lazy'} />
                {item.album ? <span className={styles.tileAlbum}>{item.album.title}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <RemovalNotice className={styles.takedown} />
        <Lightbox
          items={items}
          index={open}
          onChange={setOpen}
          onClose={() => setOpen(null)}
          renderAction={(item) =>
            item.album ? (
              <Link to={`/gallery/${item.album.slug}`} onClick={() => setOpen(null)}>
                See all of {item.album.title}
              </Link>
            ) : null
          }
        />
      </section>
    </Container>
  )
}
