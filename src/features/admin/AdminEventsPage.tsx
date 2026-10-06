import { useSettings } from '@/app/SettingsContext'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { LoadFailed } from '@/components/LoadFailed'
import { formatDateWithYear, formatLongDate, formatTime } from '@/domain/dates'
import {
  useAllEvents,
  useArchiveEvent,
  useRemoveEvent,
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

const STATUS_WORDS: Record<Event['status'], string> = {
  draft: 'Draft',
  published: 'Published',
  cancelled: 'Cancelled',
  past: 'Past',
}

export function AdminEventsPage() {
  useDocumentTitle('Events')
  const hasPlanner = useSettings().tools.length > 0
  const { data: event, isError: nextFailed } = useNextEvent()
  const upcomingQuery = useUpcomingEvents(20)
  const pastQuery = usePastEvents(6)
  const attendanceQuery = useAttendance()
  const upcoming = upcomingQuery.data
  const past = pastQuery.data
  const attendance = attendanceQuery.data
  const record = useRecordAttendance()
  const eventsToCount = [...(past ?? []), ...(upcoming ?? [])]
  /*
   * The count form needs all three: the evenings to choose from, and what is already recorded
   * for them, which it starts from. Opened without the second it would look like nothing had
   * been counted yet.
   */
  const countQueries = [pastQuery, upcomingQuery, attendanceQuery]
  const countPending = countQueries.some((q) => q.isPending)
  const countFailed = countQueries.some((q) => q.isError)
  const retryCount = () => countQueries.filter((q) => q.isError).forEach((q) => void q.refetch())
  const { data: allEvents, isPending: allPending, isError: allFailed, refetch: refetchAll } = useAllEvents()
  const titles = new Map([...eventsToCount, ...(allEvents ?? [])].map((e) => [e.id, e.title]))
  const saveEvent = useSaveEvent()
  const createEvent = useCreateEvent()
  const archive = useArchiveEvent()
  const remove = useRemoveEvent()
  /** The evening being asked about, before it is deleted. */
  const [deleting, setDeleting] = useState<Event | null>(null)
  const now = useNow()
  // null is closed, 'new' is a blank evening, an event is that one being designed.
  const [designing, setDesigningRaw] = useState<Event | 'new' | null>(null)
  /** What the last save did, said on the list it lands back on. */
  const [saved, setSaved] = useState<string | null>(null)
  const setDesigning = (next: Event | 'new' | null) => {
    setSaved(null)
    setDesigningRaw(next)
  }
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
              onSave={(draft) => {
                const done = (evening: Event) => {
                  setDesigning(null)
                  setSaved(
                    evening.status === 'draft'
                      ? `${evening.title} is saved as a draft, so it is not on the website yet.`
                      : `${evening.title} is saved.`,
                  )
                }
                if (adding) createEvent.mutate(draft, { onSuccess: done })
                else saveEvent.mutate({ id: designing.id, draft }, { onSuccess: done })
              }}
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
          <p className={styles.eyebrow}>{nextFailed ? 'Events' : `Events · ${event?.title ?? 'No event open'}`}</p>
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

      {saved ? (
        <p className={styles.said} role="status">
          {saved}
        </p>
      ) : null}

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
              {/* In the table rather than instead of it, so the columns say what will be here. */}
              {allPending ? (
                <tr>
                  <td colSpan={5} className={styles.muted} aria-busy="true">
                    Loading…
                  </td>
                </tr>
              ) : allFailed ? (
                <tr>
                  <td colSpan={5}>
                    <LoadFailed what="the events" onRetry={() => void refetchAll()} />
                  </td>
                </tr>
              ) : !allEvents?.length ? (
                <tr>
                  <td colSpan={5} className={styles.muted}>
                    No events yet. Add the first with New event.
                  </td>
                </tr>
              ) : null}
              {(allEvents ?? []).map((e) => (
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
                      {/* Cancelled said Draft, which is the one thing a cancelled evening is not:
                          it is still up, saying so. */}
                      {STATUS_WORDS[e.status]}
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
                      <Button
                        variant="danger"
                        size="sm"
                        aria-label={`Delete ${e.title}`}
                        onClick={() => {
                          remove.reset()
                          setDeleting(e)
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {archive.isError ? (
          <div className={styles.pad} style={{ paddingTop: 12 }}>
            <p className={`${styles.muted} ${styles.tiny}`} role="alert">
              That did not archive, so it is still in the list as it was. {archive.error.message}
            </p>
          </div>
        ) : null}
        <ConfirmDialog
          open={deleting !== null}
          title="Delete this event?"
          confirmLabel="Delete"
          busyLabel="Deleting…"
          busy={remove.isPending}
          error={remove.isError ? remove.error.message : undefined}
          onCancel={() => setDeleting(null)}
          onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        >
          {deleting ? (
            <>
              <strong>{deleting.title}</strong>, {formatDateWithYear(deleting.startsAt)}, goes for good — off the website and
              out of this list. A line stays in What has changed saying you deleted it.
              {deleting.status !== 'draft' ? (
                <>
                  {' '}
                  <strong>It is on the website now</strong>, so anybody following a link to it will find nothing there.
                </>
              ) : null}{' '}
              To take it off the website and keep it, set it to Draft in Design instead.
            </>
          ) : null}
        </ConfirmDialog>
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
          {countPending ? (
            <p className={styles.empty} aria-busy="true">
              Loading the events…
            </p>
          ) : countFailed ? (
            <LoadFailed what="the events and their counts" onRetry={retryCount} />
          ) : eventsToCount.length === 0 ? (
            <p className={styles.empty}>No events to count yet. Once there is one, its numbers go in here.</p>
          ) : (
            <AttendanceForm
              events={eventsToCount}
              existing={attendance ?? []}
              saving={record.isPending}
              error={record.isError ? record.error.message : undefined}
              onSave={(draft) => record.mutate(draft)}
            />
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
