import { Link } from 'react-router'
import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import { useFestivals, useNextEvent } from '@/lib/api'
import { FestivalGlyph } from '../FestivalGlyph'
import styles from '../Home.module.css'

/**
 * The community's year, told in words rather than photographs: what each occasion is, for
 * somebody who has never been to one.
 */
export function YearStrip() {
  const { data: festivals } = useFestivals()
  const { data: next } = useNextEvent()

  if (!festivals || festivals.length === 0) return null

  return (
    <Container>
      <section className={styles.year} aria-labelledby="year-title">
        <SectionHeading
          id="year-title"
          title="Our year"
          action={{ label: 'See the calendar', to: '/events' }}
        />
        <ul className={styles.occasions}>
          {festivals.map((festival) => {
            const isNext = next?.festivalId === festival.id
            return (
              <li key={festival.id} className={isNext ? styles.occasionNext : styles.occasion}>
                <FestivalGlyph id={festival.id} />
                <div className={styles.occasionHead}>
                  <h3 className={styles.occasionName}>
                    <Link to={`/events?festival=${festival.id}`} className={styles.occasionLink}>
                      {festival.name}
                    </Link>
                  </h3>
                  {festival.bengaliName ? (
                    <p lang="bn" className={styles.occasionBengali}>
                      {festival.bengaliName}
                    </p>
                  ) : null}
                </div>
                {festival.description ? <p className={styles.occasionText}>{festival.description}</p> : null}
                <p className={styles.occasionWhen}>
                  {isNext ? 'Next up' : festival.season}
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </Container>
  )
}
