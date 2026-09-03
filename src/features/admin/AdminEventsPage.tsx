import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { formatDateWithYear, formatLongDate, formatTime } from '@/domain/dates'
import { totalsFor } from '@/domain/registration'
import { useEventRegistrations, useHouseholds, useNextEvent, usePastEvents, useUpcomingEvents } from '@/lib/api'
import styles from '@/features/portal/Portal.module.css'

export function AdminEventsPage() {
  useDocumentTitle('Events')
  const { data: event } = useNextEvent()
  const { data: registrations, isPending } = useEventRegistrations(event?.id)
  const { data: households } = useHouseholds()
  const { data: upcoming } = useUpcomingEvents(20)
  const { data: past } = usePastEvents(6)

  const totals = totalsFor(registrations ?? [])
  const byId = new Map((households ?? []).map((h) => [h.id, h]))

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Events · {event?.title ?? 'No event open'}</p>
          <h1 className={styles.title} style={{ marginTop: 6 }}>
            Who is coming
          </h1>
          {event ? (
            <p className={styles.sub}>
              {formatLongDate(event.startsAt)}, {formatTime(event.startsAt)} · {event.venue}
            </p>
          ) : null}
        </div>
        <span className={styles.actions}>
          <Button variant="line" size="sm" onClick={() => {}}>
            Download for the caterer
          </Button>
          <Button variant="gold" size="sm" onClick={() => {}}>
            Edit event
          </Button>
        </span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Households</span>
          <span className={styles.statValue}>{totals.households}</span>
          <span className={styles.statNote}>registered so far</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Adults</span>
          <span className={styles.statValue}>{totals.adults}</span>
          <span className={styles.statNote}>including guests</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Children</span>
          <span className={styles.statValue}>{totals.children}</span>
          <span className={styles.statNote}>for the programme</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Meals to plan</span>
          <span className={styles.statAccent}>{totals.people}</span>
          <span className={styles.statNote}>{totals.withNotes} with dietary notes</span>
        </div>
      </div>

      <section className={styles.panel} aria-labelledby="regs-title">
        <div className={styles.panelHead}>
          <h2 id="regs-title" className={styles.panelTitle}>
            Registrations
          </h2>
          <span className={`${styles.muted} ${styles.tiny}`}>{totals.helping} offered to help</span>
        </div>
        {isPending ? (
          <p className={styles.empty} aria-busy="true">
            Loading…
          </p>
        ) : totals.households === 0 ? (
          <p className={styles.empty}>Nobody has registered yet.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Household</th>
                  <th>Adults</th>
                  <th>Children</th>
                  <th>Helping</th>
                  <th>Notes</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {(registrations ?? []).map((r) => {
                  const household = byId.get(r.householdId)
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{household?.name ?? 'A guest'}</strong>
                        <br />
                        <span className={`${styles.muted} ${styles.tiny}`}>{household?.email ?? '—'}</span>
                      </td>
                      <td className={styles.num}>{r.adults}</td>
                      <td className={styles.num}>{r.children}</td>
                      <td>{r.helping ? <span className={styles.pillWait}>{r.helping}</span> : <span className={styles.muted}>—</span>}</td>
                      <td className={`${styles.muted} ${styles.tiny}`}>{r.notes ?? '—'}</td>
                      <td className={`${styles.muted} ${styles.tiny}`}>{formatLongDate(r.registeredAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {site.tools.map((tool) => (
        <section key={tool.href} className={styles.panel} aria-labelledby="planning-title">
          <div className={styles.panelHead}>
            <h2 id="planning-title" className={styles.panelTitle}>
              {tool.name}
            </h2>
            <Button href={tool.href} variant="line" size="sm">
              Open the planner
              <Icon name="external" size={15} />
            </Button>
          </div>
          <div className={styles.pad}>
            <p className={styles.muted} style={{ maxWidth: '62ch' }}>
              {tool.description} This page counts who is coming; the planner tracks what has to happen before
              they arrive. It is a separate app with its own sign-in, and it opens in a new tab.
            </p>
          </div>
        </section>
      ))}

      <section className={styles.panel} aria-labelledby="all-events-title">
        <div className={styles.panelHead}>
          <h2 id="all-events-title" className={styles.panelTitle}>
            All events
          </h2>
          <Button variant="gold" size="sm" onClick={() => {}}>
            New event
          </Button>
        </div>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event</th>
                <th>When</th>
                <th>Registration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...(upcoming ?? []), ...(past ?? [])].map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.title}</strong>
                  </td>
                  <td className={`${styles.muted} ${styles.tiny}`}>{formatDateWithYear(e.startsAt)}</td>
                  <td>
                    <span className={e.registrationOpen ? styles.pillLive : styles.pill}>
                      {e.registrationOpen ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td>
                    <span className={e.status === 'published' ? styles.pillLive : styles.pillPast}>
                      {e.status === 'published' ? 'Published' : e.status === 'past' ? 'Past' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
