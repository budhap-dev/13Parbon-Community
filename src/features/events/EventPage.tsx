import { Link, useParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { daysUntil, describeCountdown, formatLongDate, formatTime } from '@/domain/dates'
import { NotFoundPage } from '@/features/placeholder'
import { useEvent } from '@/lib/api'
import { useNow } from '@/lib/clock'
import { RegisterForm } from './RegisterForm'
import styles from './Events.module.css'

export function EventPage() {
  const { slug = '' } = useParams()
  const { data: event, isPending } = useEvent(slug)
  const now = useNow()
  useDocumentTitle(event?.title)

  if (isPending) {
    return (
      <Container className={styles.detail}>
        <p aria-busy="true">Loading…</p>
      </Container>
    )
  }
  if (!event) return <NotFoundPage />

  const days = daysUntil(event.startsAt, now)
  const countdown = describeCountdown(days)
  const isPast = days < 0 && event.status === 'past'

  return (
    <Container className={styles.detail}>
      <article className={styles.detailBody} aria-labelledby="event-title">
        <Link to="/events" className={styles.crumb}>
          ← All events
        </Link>
        <h1 id="event-title" className={styles.detailTitle}>
          {event.title}
        </h1>
        <div className={styles.when}>
          <span className={styles.whenStrong}>
            {formatLongDate(event.startsAt)}, {formatTime(event.startsAt)}
            {event.endsAt ? ` to ${formatLongDate(event.endsAt) === formatLongDate(event.startsAt) ? '' : `${formatLongDate(event.endsAt)}, `}${formatTime(event.endsAt)}` : ''}
          </span>
          <span>{event.venue}</span>
        </div>
        <p className={styles.summary}>{event.summary}</p>
        {event.householdsRegistered > 0 ? (
          <p className={styles.households}>
            <Icon name="users" size={20} />
            <span>
              <strong>{event.householdsRegistered} households</strong> {isPast ? 'came' : 'coming so far'}
            </span>
          </p>
        ) : null}
        {!isPast ? (
          <div className={styles.actions}>
            {event.registrationOpen ? (
              <Button href="#register" variant="gold">
                Register the family
              </Button>
            ) : null}
            <Button to="/contact" variant="line">
              Ask a question
            </Button>
          </div>
        ) : null}
        {!isPast && event.registrationOpen ? (
          <div id="register">
            <RegisterForm slug={event.slug} eventTitle={event.title} />
          </div>
        ) : null}
      </article>

      <aside className={styles.side}>
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

        {!isPast && event.volunteerCall ? (
          <section className={styles.roles} aria-labelledby="roles-title">
            <h2 id="roles-title" className={styles.rolesTitle}>
              A Festival is Best Shared
            </h2>
            <p className={styles.roleMeta}>{event.volunteerCall}</p>
          </section>
        ) : null}
      </aside>
    </Container>
  )
}
