import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { daysUntil, describeCountdown, formatLongDate } from '@/domain/dates'
import { useNextEvent } from '@/lib/api'
import { useNow } from '@/lib/clock'
import styles from '../Home.module.css'

export function NextEvent() {
  const { data: event, isPending } = useNextEvent()
  const now = useNow()

  if (isPending) {
    return (
      <Container>
        <div className={styles.eventSkeleton} aria-busy="true" aria-label="Loading the next event" />
      </Container>
    )
  }
  if (!event) return null

  const countdown = describeCountdown(daysUntil(event.startsAt, now))

  return (
    <Container>
      <section className={styles.event} aria-labelledby="next-event-title">
        <div className={styles.eventBody}>
          <p className={styles.kicker}>Next event</p>
          <h2 id="next-event-title" className={styles.eventTitle}>
            {event.title}
          </h2>
          <p className={styles.eventMeta}>
            {event.venue} · from {formatLongDate(event.startsAt)} · {event.summary}
          </p>
          {event.householdsRegistered > 0 ? (
            <p className={styles.households}>
              <Icon name="users" size={20} />
              <span>
                <strong>{event.householdsRegistered} households</strong> coming so far
              </span>
            </p>
          ) : null}
          <div className={styles.eventActions}>
            {event.registrationOpen ? (
              <Button to={`/events/${event.slug}`} variant="ink" size="sm">
                Register the family
              </Button>
            ) : null}
            <Button to={`/events/${event.slug}`} variant="inkLine" size="sm">
              Volunteer
            </Button>
          </div>
        </div>
        <p className={styles.countdown}>
          <span className="sr-only">{`${countdown.value} ${countdown.label}`}</span>
          <span className={styles.countValue} aria-hidden="true">
            {countdown.value}
          </span>
          <span className={styles.countLabel} aria-hidden="true">
            {countdown.label}
          </span>
        </p>
      </section>
    </Container>
  )
}
