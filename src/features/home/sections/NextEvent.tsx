import { Button } from '@/components/Button'
import { site } from '@/app/site'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { daysUntil, describeCountdown, formatLongDate, formatTime } from '@/domain/dates'
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
          {event.theme ? (
            <p lang="bn" className={styles.eventTheme}>
              {event.theme.bengali}
              {event.theme.bengaliSubtitle ? ` — ${event.theme.bengaliSubtitle}` : ''}
            </p>
          ) : null}
          <ul className={styles.eventFacts}>
            <li className={styles.eventFact}>
              <Icon name="clock" size={19} className={styles.eventFactIcon} />
              <span>
                on {formatLongDate(event.startsAt)} at {formatTime(event.startsAt)}
              </span>
            </li>
            <li className={styles.eventFact}>
              <Icon name="pin" size={19} className={styles.eventFactIcon} />
              <span>{event.venue}</span>
            </li>
          </ul>
          <p className={styles.eventMeta}>{event.summary}</p>
          <div className={styles.eventActions}>
            {event.registrationOpen && site.registrationFormUrl ? (
              <Button href={site.registrationFormUrl} variant="ink" size="sm">
                Register the family
              </Button>
            ) : null}
            {/* Volunteering is explained on the event page, alongside everything else. */}
            <Button to={`/events/${event.slug}`} variant="inkLine" size="sm">
              Event details
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
