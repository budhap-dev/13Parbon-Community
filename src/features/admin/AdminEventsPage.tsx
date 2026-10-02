import { useSettings } from '@/app/SettingsContext'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { Button } from '@/components/Button'
import { formatDateWithYear, formatLongDate, formatTime } from '@/domain/dates'
import {
  useAllEvents,
  useArchiveEvent,
  useAttendance,
  useCreateEvent,
  useNextEvent,
  usePastEvents,
  useRecordAttendance,
  useSaveEvent,
  useUpcomingEvents,
} from '@/lib/api'
import { readyToArchive, type Event } from '@/domain/event'
import { useNow } from '@/lib/clock'
import { useState } from 'react'
import { peopleAt } from '@/domain/attendance'
import { AttendanceForm } from './AttendanceForm'
import { EventDesigner } from './EventDesigner'
import styles from '@/features/portal/Portal.module.css'

export function AdminEventsPage() {
  useDocumentTitle('Events')
  const hasPlanner = useSettings().tools.length > 0
  const { data: event } = useNextEvent()
  const { data: upcoming } = useUpcomingEvents(20)
  const { data: past } = usePastEvents(6)

  const { data: attendance } = useAttendance()
  const record = useRecordAttendance()
  const eventsToCount = [...(past ?? []), ...(upcoming ?? [])]
  const { data: allEvents } = useAllEvents()
  const titles = new Map([...eventsToCount, ...(allEvents ?? [])].map((e) => [e.id, e.title]))
  const saveEvent = useSaveEvent()
  const createEvent = useCreateEvent()
  const archive = useArchiveEvent()
  const now = useNow()
  // null is closed, 'new' is a blank evening, an event is that one being designed.
  const [designing, setDesigning] = useState<Event | 'new' | null>(null)
  // The designer replaces the list in place.
  useScrollToTopOn(designing)
  useOpenFromAddress(allEvents, setDesigning)


  if (designing) {
    const adding = designing === 'new'
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <p className={styles.eyebrow}>{adding ? 'A new evening' : 'Designing'}</p>
            <h1 className={styles.title} style={{ marginTop: 6 }}>
              {adding ? 'Add an event' : designing.title}
            </h1>
            <p className={styles.sub}>
              How this evening looks to somebody arriving to find out what is on. The planner still
              holds the logistics.
            </p>
          </div>
        </div>
        <section className={styles.panel}>
          <div className={styles.pad}>
            <EventDesigner
              event={adding ? undefined : designing}
              saving={saveEvent.isPending || createEvent.isPending}
              error={
                saveEvent.isError
                  ? saveEvent.error.message
                  : createEvent.isError
                    ? createEvent.error.message
                    : undefined
              }
              onCancel={() => setDesigning(null)}
              onSave={(draft) =>
                adding
                  ? createEvent.mutate(draft, { onSuccess: () => setDesigning(null) })
                  : saveEvent.mutate({ id: designing.id, draft }, { onSuccess: () => setDesigning(null) })
              }
            />
          </div>
        </section>
      </div>
    )
  }

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
          {/*
            * The planner used to have a panel of its own here, with a button to open it. The
            * sidebar already links it on every committee screen, so all that is left is the one
            * thing worth knowing: the two do not share their evenings.
            */}
          {hasPlanner ? (
            <p className={`${styles.muted} ${styles.tiny}`} style={{ marginTop: 6 }}>
              This is what the public sees. Tasks and logistics live in the planner, under Other tools — an
              evening added in one does not appear in the other.
            </p>
          ) : null}
        </div>
      </div>

      <section className={styles.panel} aria-labelledby="all-events-title">
        <div className={styles.panelHead}>
          <h2 id="all-events-title" className={styles.panelTitle}>
            All events
          </h2>
          <Button variant="gold" size="sm" onClick={() => setDesigning('new')}>
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
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(allEvents ?? [...(upcoming ?? []), ...(past ?? [])]).map((e) => (
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
                  <td>
                    <span className={styles.actions}>
                      <Button variant="line" size="sm" aria-label={`Design ${e.title}`} onClick={() => setDesigning(e)}>
                        Design
                      </Button>
                      {readyToArchive(e, now) ? (
                        <Button
                          variant="line"
                          size="sm"
                          aria-label={`Archive ${e.title}`}
                          disabled={archive.isPending}
                          onClick={() => archive.mutate(e.id)}
                        >
                          Archive
                        </Button>
                      ) : null}
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
                      {/* The title, where we know it: the id is a database key, not a name. */}
                      <strong>{titles.get(year.eventId) ?? year.eventId}</strong>
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
