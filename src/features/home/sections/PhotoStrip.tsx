import { useState } from 'react'
import { Link } from 'react-router'
import { Carousel } from '@/components/Carousel'
import { Container } from '@/components/Container'
import { Lightbox } from '@/components/Lightbox'
import { SectionHeading } from '@/components/SectionHeading'
import { useAlbums, useRecentMedia } from '@/lib/api'
import styles from '../Home.module.css'

/**
 * Photographs from across the albums, a handful at a time. The set is drawn at random on each
 * visit, so the home page is not the same few faces for as long as one album is the newest.
 *
 * A photograph opens full size, and says which album it came from: these are mixed together
 * here, so the picture somebody stopped on is the only clue they have about where to find
 * more of that evening.
 */
export function PhotoStrip() {
  const { data: media } = useRecentMedia(12)
  const { data: albums } = useAlbums()
  const [open, setOpen] = useState<number | null>(null)

  const items =
    media
      ?.filter((item) => item.type === 'photo')
      .map((item) => {
        const album = albums?.find((a) => a.id === item.albumId)
        return {
          id: item.id,
          src: item.url,
          alt: item.caption ?? 'Community photo',
          caption: item.caption,
          album: album ? { slug: album.slug, title: album.title } : undefined,
        }
      }) ?? []

  if (items.length === 0) return null

  return (
    <Container>
      <section className={styles.photos} aria-labelledby="moments-title">
        <SectionHeading id="moments-title" title="Moments from our year" action={{ label: 'All albums', to: '/gallery' }} />
        {/* Auto-advance stops while a photograph is open: nothing should move under a reader. */}
        <Carousel
          label="Photographs from our events"
          items={items}
          autoAdvanceMs={open === null ? 6000 : 0}
          onSelect={setOpen}
        />
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
