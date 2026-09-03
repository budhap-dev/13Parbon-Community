import { Container } from '@/components/Container'
import { EventCard } from '@/components/EventCard'
import { SectionHeading } from '@/components/SectionHeading'
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
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  )
}
