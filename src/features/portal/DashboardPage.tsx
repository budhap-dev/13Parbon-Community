import { Link } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { daysUntil, describeCountdown, formatDateWithYear, formatLongDate, formatTime } from '@/domain/dates'
import { useAnnouncements, useHousehold, useHouseholdRegistrations, useNextEvent, useUpcomingEvents } from '@/lib/api'
import { useSignedIn } from '@/lib/auth/session'
import { useNow } from '@/lib/clock'
import styles from './Portal.module.css'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const who = useSignedIn()
  const now = useNow()
  const { data: event } = useNextEvent()
  const { data: upcoming } = useUpcomingEvents(6)
  const { data: household } = useHousehold(who?.householdId)
  const { data: registrations } = useHouseholdRegistrations(who?.householdId)
  const { data: announcements } = useAnnouncements()

  const registeredFor = new Set((registrations ?? []).map((r) => r.eventId))
  const countdown = event ? describeCountdown(daysUntil(event.startsAt, now)) : null
  const eventsById = new Map((upcoming ?? []).map((e) => [e.id, e]))

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.sub}>Everything for your household in one place.</p>
        </div>
      </div>

      {event && countdown ? (
        <section className={styles.feature} aria-labelledby="next-title">
          <div className={styles.featureBody}>
            <p className={styles.eyebrow}>Next event</p>
            <h2 id="next-title" className={styles.featureTitle}>
              {event.title}
            </h2>
            <p className={styles.muted}>
              {formatLongDate(event.startsAt)}, {formatTime(event.startsAt)} · {event.venue} · {event.summary}
            </p>
            {registeredFor.has(event.id) ? (
              <p className={styles.note}>Your household is registered. You can change it any time before the day.</p>
            ) : (
              <p className={styles.note}>
                Your household has not registered yet.
                {event.householdsRegistered > 0 ? ` ${event.householdsRegistered} households are coming so far.` : ''}
              </p>
            )}
            <div className={styles.actions}>
              <Button to={`/events/${event.slug}`} variant="gold" size="sm">
                {registeredFor.has(event.id) ? 'Change our registration' : 'Register the household'}
              </Button>
              <Button to={`/events/${event.slug}`} variant="line" size="sm">
                Event details
              </Button>
            </div>
          </div>
          <p className={styles.countdown}>
            <span className={styles.countValue}>{countdown.value}</span>
            <span className={styles.countLabel}>{countdown.label}</span>
          </p>
        </section>
      ) : null}

      <div className={styles.two}>
        <section className={styles.panel} aria-labelledby="regs-title">
          <div className={styles.panelHead}>
            <h2 id="regs-title" className={styles.panelTitle}>
              Your registrations
            </h2>
            <Link to="/events" className={styles.tiny}>
              All events
            </Link>
          </div>
          {registrations && registrations.length > 0 ? (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Coming</th>
                    <th>Helping</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => {
                    const forEvent = eventsById.get(r.eventId)
                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{forEvent?.title ?? 'An earlier event'}</strong>
                        </td>
                        <td className={`${styles.num} ${styles.muted}`}>
                          {r.adults} {r.adults === 1 ? 'adult' : 'adults'}
                          {r.children > 0 ? `, ${r.children} ${r.children === 1 ? 'child' : 'children'}` : ''}
                        </td>
                        <td className={styles.muted}>{r.helping ?? '—'}</td>
                        <td className={`${styles.muted} ${styles.tiny}`}>{formatDateWithYear(r.registeredAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.empty}>Nothing yet. Register for the next event and it will appear here.</p>
          )}
        </section>

        <div className={styles.stack}>
          {household ? (
            <section className={styles.panel} aria-labelledby="membership-title">
              <div className={styles.pad}>
                <p className={styles.statLabel}>Membership</p>
                <div className={styles.rowBetween} style={{ alignItems: 'baseline', marginTop: 8 }}>
                  <h2 id="membership-title" className={styles.panelTitle}>
                    {household.membership.status === 'active' ? 'Active' : 'Lapsed'}
                  </h2>
                  <span className={household.membership.status === 'active' ? styles.pillLive : styles.pillPast}>
                    {household.membership.status === 'active' ? 'Paid' : 'Renew'}
                  </span>
                </div>
                <p className={`${styles.muted} ${styles.tiny}`} style={{ marginTop: 8 }}>
                  {household.membership.status === 'active' ? 'Runs to ' : 'Ran out '}
                  {formatDateWithYear(household.membership.paidTo)}.
                </p>
              </div>
            </section>
          ) : null}

          <section className={styles.panel} aria-labelledby="announce-title">
            <div className={styles.panelHead}>
              <h2 id="announce-title" className={styles.panelTitle}>
                Announcements
              </h2>
            </div>
            {announcements && announcements.length > 0 ? (
              <div className={styles.list}>
                {announcements.map((a) => (
                  <div key={a.id} className={styles.listItem}>
                    <Icon name="megaphone" size={18} />
                    <div className={styles.listBody}>
                      <strong>{a.title}</strong>
                      <span className={`${styles.muted} ${styles.tiny}`}>{a.body}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>Nothing pinned right now.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
