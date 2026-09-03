import { Link } from 'react-router'
import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import { useFestivals, useNextEvent } from '@/lib/api'
import styles from '../Home.module.css'

export function YearStrip() {
  const { data: festivals } = useFestivals()
  const { data: next } = useNextEvent()

  if (!festivals || festivals.length === 0) return null

  return (
    <Container>
      <section className={styles.year} aria-labelledby="year-title">
        <SectionHeading id="year-title" title="Our year" eyebrow />
        <ul className={styles.chips}>
          {festivals.map((festival) => {
            const isNext = next?.festivalId === festival.id
            return (
              <li key={festival.id}>
                <Link
                  to={`/events?festival=${festival.id}`}
                  className={isNext ? styles.chipActive : styles.chip}
                  aria-label={isNext ? `${festival.name}, next up` : undefined}
                >
                  {festival.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </Container>
  )
}
