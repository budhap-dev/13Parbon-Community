import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { formatDateWithYear, formatLongDate, formatTime } from '@/domain/dates'
import { useAttendance, useNextEvent, usePastEvents, useRecordAttendance, useUpcomingEvents } from '@/lib/api'
import { peopleAt } from '@/domain/attendance'
import { AttendanceForm } from './AttendanceForm'
import styles from '@/features/portal/Portal.module.css'

export function AdminEventsPage() {
  useDocumentTitle('Events')
  const { data: event } = useNextEvent()
  const { data: upcoming } = useUpcomingEvents(20)
  const { data: past } = usePastEvents(6)

  const { data: attendance } = useAttendance()
  const record = useRecordAttendance()
  const eventsToCount = [...(past ?? []), ...(upcoming ?? [])]
  const tool0 = site.tools[0].href


  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Events · {event?.title ?? 'No event open'}</p>
          <h1 className={styles.title} style={{ marginTop: 6 }}>
            Events
          </h1>
          {event ? (
            <p className={styles.sub}>
              {formatLongDate(event.startsAt)}, {formatTime(event.startsAt)} · {event.venue}
            </p>
          ) : null}
        </div>
        <span className={styles.actions}>
          <Button variant="line" size="sm" href={site.tools[0].href}>
            Open the planner
          </Button>
        </span>
      </div>

      <p className={styles.note}>
        Events are put together in the planner, and people book through the form on the event page.
        Neither of those lives here — what this page keeps is the number who came, once the night is
        over.
      </p>

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
              {tool.description} This page keeps the number who came; the planner tracks what has to happen before
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
          <Button href={tool0} variant="line" size="sm">
            New event in the planner
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
      <section className={styles.panel} aria-labelledby="attendance-title">
        <div className={styles.panelHead}>
          <h2 id="attendance-title" className={styles.panelTitle}>
            How many came
          </h2>
        </div>
        <div className={styles.pad}>
          <p className={`${styles.muted} ${styles.tiny}`} style={{ marginBottom: 16 }}>
            After the night, put the numbers in from your form's replies. The sheet stays where it
            is — this keeps the count and nothing about who, which is all the history and the
            caterer ever need.
          </p>
          {eventsToCount.length > 0 ? (
            <AttendanceForm
              events={eventsToCount}
              existing={attendance ?? []}
              saving={record.isPending}
              error={record.isError ? record.error.message : undefined}
              onSave={(draft) => record.mutate(draft)}
            />
          ) : (
            <p className={styles.empty} aria-busy="true">
              Loading the events…
            </p>
          )}
        </div>

        {attendance && attendance.length > 0 ? (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Held</th>
                  <th className={styles.num}>Households</th>
                  <th className={styles.num}>People</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((year) => (
                  <tr key={year.eventId}>
                    <td>
                      <strong>{year.eventId}</strong>
                    </td>
                    <td className={styles.muted}>{formatDateWithYear(year.heldOn)}</td>
                    <td className={`${styles.num} ${styles.muted}`}>{year.households}</td>
                    <td className={styles.num}>{peopleAt(year)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

    </div>
  )
}
