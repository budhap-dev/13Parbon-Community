import { Link, useParams } from 'react-router'
import { activeSocial, site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { LoadFailed } from '@/components/LoadFailed'
import { ShareButton } from '@/components/ShareButton'
import { ThenNowCollage } from '@/components/ThenNowCollage'
import { VenueMap } from '@/components/VenueMap'
import { daysUntil, describeCountdown, formatLongDate, formatTime } from '@/domain/dates'
import { NotFoundPage } from '@/features/placeholder'
import { useEvent } from '@/lib/api'
import { useNow } from '@/lib/clock'
import styles from './Events.module.css'

/** Whether an end time falls on the same day, so the date need not be repeated. */
function sameDay(a: string, b: string): boolean {
  return formatLongDate(a) === formatLongDate(b)
}

export function EventPage() {
  const facebook = activeSocial().find((channel) => channel.name === 'Facebook')
  const { slug = '' } = useParams()
  const { data: event, isPending, isError, refetch } = useEvent(slug)
  const now = useNow()
  useDocumentTitle(event?.title)

  if (isPending) {
    return (
      <Container className={styles.detail}>
        <p aria-busy="true">Loading…</p>
      </Container>
    )
  }
  // Not the same as an event that does not exist: this one may well, we just could not reach it.
  if (isError) {
    return (
      <Container className={styles.detail}>
        <LoadFailed what="this event" onRetry={() => void refetch()} />
      </Container>
    )
  }
  if (!event) return <NotFoundPage />

  const days = daysUntil(event.startsAt, now)
  const countdown = describeCountdown(days)
  const isPast = days < 0 && event.status === 'past'

  return (
    <Container className={styles.detail}>
      <header className={styles.head}>
        <div className={styles.headTop}>
          <Link to="/events" className={styles.crumb}>
            ← All events
          </Link>
          <ShareButton title={`${event.title} · ${site.name}`} text={event.summary} size="sm" />
        </div>
        <h1 id="event-title" className={styles.detailTitle}>
          {event.title}
        </h1>
      </header>

      {event.theme ? (
          <section className={styles.theme} aria-labelledby="theme-label">
            <p id="theme-label" className={styles.themeLabel}>
              This year’s theme
            </p>
            <p lang="bn" className={styles.themeBengali}>
              {event.theme.bengali}
            </p>
            {event.theme.bengaliSubtitle ? (
              <p lang="bn" className={styles.themeBengaliSub}>
                {event.theme.bengaliSubtitle}
              </p>
            ) : null}
            {event.theme.english ? <p className={styles.themeEnglish}>{event.theme.english}</p> : null}
            <ThenNowCollage
              label="Calcutta then, Kolkata now"
              images={site.themeImages}
              credit={site.themeImageCredit}
            />
        </section>
      ) : null}

      <article className={styles.detailBody} aria-labelledby="event-title">
        <ul className={styles.facts}>
          <li className={styles.fact}>
            <Icon name="clock" size={20} className={styles.factIcon} />
            <span>
              <strong>{formatLongDate(event.startsAt)}</strong>
              <br />
              {formatTime(event.startsAt)}
              {event.endsAt ? ` to ${sameDay(event.startsAt, event.endsAt) ? '' : `${formatLongDate(event.endsAt)}, `}${formatTime(event.endsAt)}` : ''}
            </span>
          </li>
          <li className={styles.fact}>
            <Icon name="pin" size={20} className={styles.factIcon} />
            <span>
              {event.venue}
              {event.venueAddress ? (
                <>
                  <br />
                  {event.venueAddress}
                </>
              ) : null}
            </span>
          </li>
        </ul>
        <p className={styles.summary}>{event.summary}</p>
        {!isPast ? (
          <div className={styles.actions}>
            {event.volunteerCall ? (
              site.volunteerFormUrl ? (
                <Button href={site.volunteerFormUrl} variant="line">
                  Volunteer
                </Button>
              ) : (
                <Button to="/contact" variant="line">
                  Volunteer
                </Button>
              )
            ) : null}
            <Button to="/contact" variant="line">
              Ask a question
            </Button>
          </div>
        ) : null}
        {!isPast ? (
          <p className={styles.note}>
            There is nothing to book. We put the details out on our WhatsApp group and{' '}
            <a href={facebook?.href} target="_blank" rel="noreferrer">
              Facebook page
            </a>
            , so keep an eye there. Or <Link to="/contact">tell the committee</Link> you are coming and we will
            add you to the numbers.
          </p>
        ) : null}
      </article>

      <aside className={styles.side}>
        {event.coordinates ? (
          <section className={styles.roles} aria-labelledby="getting-there-title">
            <h2 id="getting-there-title" className={styles.rolesTitle}>
              <Icon name="pin" size={22} className={styles.rolesIcon} />
              Getting there
            </h2>
            <VenueMap venue={event.venue} address={event.venueAddress} coordinates={event.coordinates} />
          </section>
        ) : null}

        {!isPast ? (
          <p className={styles.countdown}>
          <span className="sr-only">{`${countdown.value} ${countdown.label}`}</span>
            <span className={styles.countValue} aria-hidden="true">
              {countdown.value}
            </span>
            <span className={styles.countLabel} aria-hidden="true">
              {countdown.label}
            </span>
          </p>
        ) : null}

        {!isPast && event.performerCall ? (
          <section className={styles.roles} aria-labelledby="perform-title">
            <h2 id="perform-title" className={styles.rolesTitle}>
              <Icon name="mic" size={22} className={styles.rolesIcon} />
              Would you like to perform?
            </h2>
            <p className={styles.roleMeta}>{event.performerCall}</p>
            <Button to="/contact" variant="line">
              Register to perform
            </Button>
          </section>
        ) : null}

        {!isPast && event.volunteerCall ? (
          <section className={styles.roles} aria-labelledby="roles-title">
            <h2 id="roles-title" className={styles.rolesTitle}>
              <Icon name="heart" size={22} className={styles.rolesIcon} />
              A Festival is Best Shared
            </h2>
            <p className={styles.roleMeta}>{event.volunteerCall}</p>
          </section>
        ) : null}
      </aside>
    </Container>
  )
}
