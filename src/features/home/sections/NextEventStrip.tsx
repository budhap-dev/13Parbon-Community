import { Link } from 'react-router'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { daysUntil, describeCountdown, formatDayMonth, formatTime } from '@/domain/dates'
import { useNextEvent } from '@/lib/api'
import { useNow } from '@/lib/clock'
import styles from '../Home.module.css'

/**
 * The next gathering, at the very top of the page. The card further down carries the detail;
 * this is so nobody has to scroll past a screen of logo to learn there is something on.
 */
export function NextEventStrip() {
  const { data: event } = useNextEvent()
  const now = useNow()
  if (!event) return null

  const stamp = formatDayMonth(event.startsAt)
  const countdown = describeCountdown(daysUntil(event.startsAt, now))

  return (
    <Link to={`/events/${event.slug}`} className={styles.strip}>
      <Container className={styles.stripInner}>
        <span className={styles.stripDate}>
          {stamp.day} {stamp.month}
        </span>
        <span className={styles.stripName}>{event.title}</span>
        <span className={styles.stripWhen}>{formatTime(event.startsAt)}</span>
        <span className={styles.stripCount}>
          {countdown.value === 'Today' || countdown.value === 'Now'
            ? countdown.value
            : `${countdown.value} ${countdown.label}`}
        </span>
        <Icon name="chevronRight" size={18} className={styles.stripArrow} />
      </Container>
    </Link>
  )
}
