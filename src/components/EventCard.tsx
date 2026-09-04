import { Link } from 'react-router'
import type { Event } from '@/domain/event'
import { formatDayMonth } from '@/domain/dates'
import styles from './EventCard.module.css'

/** A dated card for an event, used on the home page and the calendar. */
export function EventCard({ event, headingLevel = 3 }: { event: Event; headingLevel?: 2 | 3 }) {
  const stamp = formatDayMonth(event.startsAt)
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const isPast = event.status === 'past'
  return (
    <article className={isPast ? styles.cardPast : styles.card}>
      <span className={styles.stamp}>
        {stamp.day} {stamp.month}
      </span>
      <Heading className={styles.title}>
        <Link to={`/events/${event.slug}`} className={styles.titleLink}>
          {event.title}
        </Link>
      </Heading>
      <p className={styles.meta}>
        {event.venue} · {event.summary}
      </p>
      <span className={styles.action}>{isPast ? 'Look back' : 'Details'}</span>
    </article>
  )
}
