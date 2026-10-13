import { Button } from '@/components/Button'
import { LoadFailed } from '@/components/LoadFailed'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { daysUntil, describeCountdown, formatLongDate, formatTime } from '@/domain/dates'
import { nextFestivalBySeason } from '@/domain/festival'
import { useFestivals, useNextEvent, usePastEvents } from '@/lib/api'
import { useNow } from '@/lib/clock'
import styles from '../Home.module.css'

export function NextEvent() {
  const { data: event, isPending, isError, refetch } = useNextEvent()
  const now = useNow()

  if (isPending) {
    return (
      <Container>
        {/* role="status", because a bare div may not carry aria-label: ARIA prohibits it on
            anything with no role, so this announced nothing at all. Every other placeholder in
            the app is a <p> with words in it, which is why only this one was wrong. */}
        <div className={styles.eventSkeleton} role="status" aria-busy="true" aria-label="Loading the next event" />
      </Container>
    )
  }
  // The home page can carry on without this section, but not silently: somebody arriving
  // to find out what is on should be told we could not say, rather than shown nothing.
  if (isError) {
    return (
      <Container>
        <LoadFailed what="the next event" onRetry={() => void refetch()} />
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
            {/* The form is the one thing worth doing from here; everything else is on the event page. */}
            {event.registrationOpen && event.registrationUrl ? (
              <Button href={event.registrationUrl} variant="ink" size="sm">
                Register to come
              </Button>
            ) : null}
            {/* Volunteering is explained on the event page, alongside everything else. */}
            <Button to={`/events/${event.slug}`} variant="inkLine" size="sm" className={styles.eventDetails}>
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

/**
 * The next evening as a ticket, beside the hero's buttons: both names, when, where, and the one
 * thing to do about it. With nothing dated it still names what comes round next, rather than
 * leaving a gap where the ticket would be.
 */
export function HeroTicket() {
  const { data: event, isPending, isError } = useNextEvent()
  const { data: festivals } = useFestivals()
  const { data: past } = usePastEvents(10)
  const now = useNow()
  // A calendar that could not be read is not one with nothing on it: no ticket, rather than a
  // festival "date being settled" that may well have a date.
  if (isPending || isError) return null

  const festival = event
    ? festivals?.find((f) => f.id === event.festivalId)
    : festivals && nextFestivalBySeason(festivals, now, past)
  if (!event && !festival) return null

  const english = event ? (festival?.name ?? event.title) : festival!.name
  const countdown = event ? describeCountdown(daysUntil(event.startsAt, now)) : null
  const going =
    event?.registrationOpen && event.registrationUrl ? { href: event.registrationUrl } : event ? { to: `/events/${event.slug}` } : null

  return (
    <aside className={styles.ticket} aria-label={`Next: ${english}`}>
      <div className={styles.ticketMain}>
        {festival?.bengaliName ? (
          <p lang="bn" className={styles.ticketBengali}>
            {festival.bengaliName}
          </p>
        ) : null}
        <p className={styles.ticketName}>{english}</p>
        {event ? (
          <ul className={styles.ticketFacts}>
            <li>
              <Icon name="clock" size={17} /> {formatLongDate(event.startsAt)}, {formatTime(event.startsAt)}
            </li>
            <li>
              <Icon name="pin" size={17} /> {event.venue}
            </li>
          </ul>
        ) : (
          <p className={styles.ticketFacts}>
            {festival!.season ? `${festival!.season}, ` : ''}date being settled
          </p>
        )}
        {going ? (
          <Button {...going} variant="ink" size="sm" className={styles.ticketButton}>
            We are coming
          </Button>
        ) : null}
      </div>
      {countdown ? (
        <p className={styles.ticketStub}>
          <span className={styles.ticketDays}>{countdown.value}</span>
          <span className={styles.ticketDaysLabel}>{countdown.label}</span>
        </p>
      ) : null}
    </aside>
  )
}
