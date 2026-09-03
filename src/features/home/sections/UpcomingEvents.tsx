import { Link } from 'react-router'
import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import { formatDayMonth } from '@/domain/dates'
import { useUpcomingEvents } from '@/lib/api'
import styles from '../Home.module.css'

const FEATURED = 1
const SHOWN = 3

/** The three events after the featured next festival. */
export function UpcomingEvents() {
  const { data } = useUpcomingEvents(FEATURED + SHOWN)
  const events = data?.slice(FEATURED, FEATURED + SHOWN) ?? []

  if (events.length === 0) return null

  return (
    <Container>
      <section className={styles.upcoming} aria-labelledby="upcoming-title">
        <SectionHeading id="upcoming-title" title="Coming up" action={{ label: 'Full calendar', to: '/events' }} />
        <ul className={styles.cards}>
          {events.map((event) => {
            const stamp = formatDayMonth(event.startsAt)
            return (
              <li key={event.id} className={styles.card}>
                <span className={styles.stamp}>
                  {stamp.day} {stamp.month}
                </span>
                <h3 className={styles.cardTitle}>{event.title}</h3>
                <p className={styles.cardMeta}>
                  {event.venue} · {event.summary}
                </p>
                <Link to={`/events/${event.slug}`} className={styles.cardLink}>
                  {event.registrationOpen ? 'RSVP for your family' : 'Details'}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </Container>
  )
}
