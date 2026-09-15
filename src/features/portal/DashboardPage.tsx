import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { daysUntil, describeCountdown, formatDateWithYear, formatLongDate, formatTime } from '@/domain/dates'
import { useAnnouncements, useHousehold, useNextEvent } from '@/lib/api'
import { useSignedIn } from '@/lib/auth/session'
import { useNow } from '@/lib/clock'
import styles from './Portal.module.css'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const who = useSignedIn()
  const now = useNow()
  const { data: event } = useNextEvent()
  const { data: household } = useHousehold(who?.householdId)
  const { data: announcements } = useAnnouncements()

  const countdown = event ? describeCountdown(daysUntil(event.startsAt, now)) : null

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
            {event.householdsRegistered > 0 ? (
              <p className={styles.note}>{event.householdsRegistered} households are coming so far.</p>
            ) : null}
            <div className={styles.actions}>
              <Button to={`/events/${event.slug}`} variant="gold" size="sm">
                Book your places
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
