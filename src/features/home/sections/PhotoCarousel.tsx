import { Carousel } from '@/components/Carousel'
import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import { useRecentMedia } from '@/lib/api'
import styles from '../Home.module.css'

export function PhotoCarousel() {
  const { data: media } = useRecentMedia(6)
  const items =
    media
      ?.filter((item) => item.type === 'photo')
      .map((item) => ({
        id: item.id,
        src: item.url,
        alt: item.caption ?? 'Community photo',
        caption: item.caption,
      })) ?? []

  if (items.length === 0) return null

  return (
    <Container>
      <section className={styles.photos} aria-labelledby="photos-title">
        <SectionHeading id="photos-title" title="Last year" action={{ label: 'All albums', to: '/gallery' }} />
        <Carousel label="Photos from last year" items={items} autoAdvanceMs={6000} />
      </section>
    </Container>
  )
}
