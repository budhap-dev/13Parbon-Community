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
  // The theme, run across whatever room the strip has left between the name and the countdown.
  const themeLine = event.theme
    ? [event.theme.bengali, event.theme.bengaliSubtitle].filter(Boolean).join(' — ')
    : ''

  return (
    <Link to={`/events/${event.slug}`} className={styles.strip}>
      <Container className={styles.inner}>
        <span className={styles.card}>
          {/* The day and the hour are one fact, so they wear one badge. */}
          <span className={styles.date}>
            {stamp.day} {stamp.month}, {formatTime(event.startsAt)}
          </span>
          <span className={styles.name}>{event.title}</span>
          {themeLine ? (
            <span className={styles.theme}>
              <span className={styles.themeTrack}>
                <span lang="bn" className={styles.themeText}>
                  {themeLine}
                </span>
                {/* A second copy so the loop closes on itself; only the first is announced. */}
                <span lang="bn" aria-hidden="true" className={styles.themeText}>
                  {themeLine}
                </span>
              </span>
            </span>
          ) : null}
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
