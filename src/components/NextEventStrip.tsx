import { Link } from 'react-router'
import { Container } from './Container'
import { Icon } from './Icon'
import { daysUntil, describeCountdown, formatDayMonth, formatTime } from '@/domain/dates'
import { useNextEvent } from '@/lib/api'
import { useNow } from '@/lib/clock'
import styles from './NextEventStrip.module.css'

/**
 * The next gathering, pinned under the wordmark. The card further down carries the detail;
 * this is so nobody has to scroll past a screen of logo to learn there is something on, and
 * so it stays in view while they read the rest.
 */
export function NextEventStrip() {
  const { data: event } = useNextEvent()
  const now = useNow()
  if (!event) return null

  const stamp = formatDayMonth(event.startsAt)
  const countdown = describeCountdown(daysUntil(event.startsAt, now))

  return (
    <Link to={`/events/${event.slug}`} className={styles.strip}>
      <Container className={styles.inner}>
        <span className={styles.card}>
          <span className={styles.date}>
          {stamp.day} {stamp.month}
        </span>
          <span className={styles.name}>{event.title}</span>
          <span className={styles.when}>{formatTime(event.startsAt)}</span>
          <span className={styles.count}>
            {countdown.value === 'Today' || countdown.value === 'Now'
            ? countdown.value
            : `${countdown.value} ${countdown.label}`}
          </span>
          <Icon name="chevronRight" size={18} className={styles.arrow} />
        </span>
      </Container>
    </Link>
  )
}
