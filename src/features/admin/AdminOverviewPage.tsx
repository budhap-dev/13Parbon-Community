import { Link } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { formatLongDate } from '@/domain/dates'
import { totalsFor } from '@/domain/registration'
import { useContactMessages, useEventRegistrations, useHouseholds, useNextEvent, useSignInAttempts } from '@/lib/api'
import styles from '@/features/portal/Portal.module.css'

function Stat({ label, value, note, accent }: { label: string; value: string | number; note: string; accent?: boolean }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={accent ? styles.statAccent : styles.statValue}>{value}</span>
      <span className={styles.statNote}>{note}</span>
    </div>
  )
}

export function AdminOverviewPage() {
  useDocumentTitle('Committee overview')
  const { data: households } = useHouseholds()
  const { data: attempts } = useSignInAttempts()
  const { data: messages } = useContactMessages()
  const { data: event } = useNextEvent()
  const { data: registrations } = useEventRegistrations(event?.id)

  const totals = totalsFor(registrations ?? [])
  const memberCount = households?.length ?? 0
  const signedIn = households?.filter((h) => h.googleEmail).length ?? 0
  const admins = households?.filter((h) => h.role === 'admin').length ?? 0
  const unhandled = messages?.filter((m) => !m.handledBy) ?? []
  const filled = memberCount > 0 ? Math.round((totals.households / memberCount) * 100) : 0

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Committee overview</h1>
          <p className={styles.sub}>What needs a decision, and how the next event is filling up.</p>
        </div>
      </div>

      <div className={styles.stats}>
        <Stat label="Waiting on you" value={attempts?.length ?? 0} note="tried to sign in, not on the list" accent />
        <Stat label="Unread" value={unhandled.length} note="messages from the public" accent />
        <Stat label="Registered" value={totals.households} note={event ? `households for ${event.title}` : 'households'} />
        <Stat label="Members" value={memberCount} note={`${signedIn} have signed in, ${admins} admins`} />
      </div>

      <div className={styles.two}>
        {event ? (
          <section className={styles.panel} aria-labelledby="fill-title">
            <div className={styles.panelHead}>
              <h2 id="fill-title" className={styles.panelTitle}>
                {event.title} · {formatLongDate(event.startsAt)}
              </h2>
              <Button to="/admin/events" variant="line" size="sm">
                Who is coming
              </Button>
            </div>
            <div className={styles.pad} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className={styles.stats}>
                <div>
                  <span className={styles.statLabel}>Households</span>
                  <p className={styles.statValue}>{totals.households}</p>
                </div>
                <div>
                  <span className={styles.statLabel}>Adults</span>
                  <p className={styles.statValue}>{totals.adults}</p>
                </div>
                <div>
                  <span className={styles.statLabel}>Children</span>
                  <p className={styles.statValue}>{totals.children}</p>
                </div>
                <div>
                  <span className={styles.statLabel}>For the caterer</span>
                  <p className={styles.statAccent}>{totals.people}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div className={styles.rowBetween}>
                  <span className={`${styles.muted} ${styles.tiny}`}>
                    {totals.households} of {memberCount} households
                  </span>
                  <span className={`${styles.muted} ${styles.tiny}`}>{filled}%</span>
                </div>
                <div className={styles.bar}>
                  <div className={styles.barFill} style={{ width: `${filled}%` }} />
                </div>
              </div>
              <p className={`${styles.muted} ${styles.tiny}`}>
                {totals.helping} {totals.helping === 1 ? 'household has' : 'households have'} offered to help.{' '}
                {totals.withNotes} left a note about food or access.
              </p>
            </div>
          </section>
        ) : null}

        <section className={styles.panel} aria-labelledby="decide-title">
          <div className={styles.panelHead}>
            <h2 id="decide-title" className={styles.panelTitle}>
              Needs a decision
            </h2>
          </div>
          {(attempts?.length ?? 0) + unhandled.length === 0 ? (
            <p className={styles.empty}>Nothing waiting. </p>
          ) : (
            <div className={styles.list}>
              {(attempts ?? []).map((attempt) => (
                <div key={attempt.id} className={styles.listItem}>
                  <span className={styles.dot} />
                  <div className={styles.listBody}>
                    <strong>{attempt.email}</strong>
                    <span className={`${styles.muted} ${styles.tiny}`}>
                      Tried to sign in {attempt.attempts === 1 ? 'once' : `${attempt.attempts} times`} · not on the list
                    </span>
                  </div>
                  <Link to="/admin/people" className={styles.tiny}>
                    Add
                  </Link>
                </div>
              ))}
              {unhandled.map((message) => (
                <div key={message.id} className={styles.listItem}>
                  <span className={styles.dot} />
                  <div className={styles.listBody}>
                    <strong>{message.subject}</strong>
                    <span className={`${styles.muted} ${styles.tiny}`}>
                      From {message.name} · {formatLongDate(message.createdAt)}
                    </span>
                  </div>
                  <Link to="/admin/messages" className={styles.tiny}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
