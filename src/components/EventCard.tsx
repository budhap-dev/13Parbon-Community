import { Link } from 'react-router'
import { Icon } from './Icon'
import { isCancelled, type Event } from '@/domain/event'
import { formatDayMonth } from '@/domain/dates'
import styles from './EventCard.module.css'

/** A dated card for an event, used on the home page and the calendar. */
export function EventCard({ event, headingLevel = 3 }: { event: Event; headingLevel?: 2 | 3 }) {
  const stamp = formatDayMonth(event.startsAt)
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const isPast = event.status === 'past'
  const cancelled = isCancelled(event)
  return (
    <article className={cancelled ? styles.cardCancelled : isPast ? styles.cardPast : styles.card}>
      <span className={styles.stamp}>
        {stamp.day} {stamp.month}
      </span>
      <Heading className={styles.title}>
        <Link to={`/events/${event.slug}`} className={styles.titleLink}>
          {event.title}
        </Link>
      </Heading>
      {/* On the card as well as the page. Somebody scanning the calendar for what is on should
          not have to open an evening to find out it is off. */}
      {cancelled ? <p className={styles.cancelled}>Cancelled</p> : null}
      <p className={styles.meta}>
        {event.venue} · {event.summary}
      </p>
      <span className={styles.action}>
        {cancelled ? 'What happened' : isPast ? 'Look back' : 'Details'}
        <Icon name="chevronRight" size={17} className={styles.actionArrow} />
      </span>
    </article>
  )
}
