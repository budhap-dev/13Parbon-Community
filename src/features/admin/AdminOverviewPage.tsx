import { Link } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { LoadFailed } from '@/components/LoadFailed'
import { formatLongDate } from '@/domain/dates'
import { peopleAt } from '@/domain/attendance'
import { unresolved } from '@/domain/document'
import { waiting } from '@/domain/feedback'
import { useAllFeedback, useAttendance, useContactMessages, useHouseholds, useSignInAttempts } from '@/lib/api'
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

/**
 * What a figure shows until it is known. A 0 here reads as "nobody is waiting", which is an
 * answer, so a figure that has not arrived — or never will — must not look like one.
 */
type Read = { isPending: boolean; isError: boolean }
const LOADING = '…'
const FAILED = '—'
const figure = (query: Read, value: () => string | number) =>
  query.isPending ? LOADING : query.isError ? FAILED : value()
const noteFor = (query: Read, note: () => string) =>
  query.isPending ? 'loading' : query.isError ? 'could not be loaded' : note()

export function AdminOverviewPage() {
  useDocumentTitle('Committee overview')
  const householdsQuery = useHouseholds()
  const attemptsQuery = useSignInAttempts()
  const messagesQuery = useContactMessages()
  const attendanceQuery = useAttendance()
  const feedbackQuery = useAllFeedback()
  const households = householdsQuery.data
  /*
   * The same rule as the People screen and the sidebar: an address that now belongs to a
   * household has had its answer. Filtered on `resolved` alone, somebody added from People
   * went on being counted here as waiting, on the one screen that is meant to say what is.
   */
  const attempts = attemptsQuery.data ? unresolved(attemptsQuery.data, households ?? []) : undefined
  // Which knocks have been answered depends on who is on the list, so neither half is enough.
  const knocks: Read = {
    isPending: attemptsQuery.isPending || householdsQuery.isPending,
    isError: attemptsQuery.isError || householdsQuery.isError,
  }
  const messages = messagesQuery.data
  const attendance = attendanceQuery.data
  const feedback = feedbackQuery.data
  const unapproved = waiting(feedback ?? [])

  const queries = [householdsQuery, attemptsQuery, messagesQuery, attendanceQuery, feedbackQuery]
  const failed = queries.filter((q) => q.isError)
  const retry = () => failed.forEach((q) => void q.refetch())
  // The decisions list is only "nothing waiting" when every queue it reads from has answered.
  const decisionQueries = [attemptsQuery, householdsQuery, messagesQuery, feedbackQuery]
  const decisionsPending = decisionQueries.some((q) => q.isPending)
  const decisionsFailed = decisionQueries.some((q) => q.isError)

  /** The most recent night we have a number for. Nothing here is per household any more. */
  const lastCounted = attendance?.[0]
  const memberCount = households?.length ?? 0
  const signedIn = households?.filter((h) => h.googleEmail).length ?? 0
  const admins = households?.filter((h) => h.role === 'admin').length ?? 0
  const unhandled = messages?.filter((m) => !m.handledBy) ?? []
  const filled = memberCount > 0 && lastCounted ? Math.round((lastCounted.households / memberCount) * 100) : 0

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Committee overview</h1>
          <p className={styles.sub}>What needs a decision, and how the next event is filling up.</p>
        </div>
      </div>

      {failed.length > 0 ? <LoadFailed what="some of these figures" onRetry={retry} /> : null}

      <div className={styles.stats} aria-busy={queries.some((q) => q.isPending) || undefined}>
        <Stat
          label="Waiting on you"
          value={figure(knocks, () => attempts?.length ?? 0)}
          note={noteFor(knocks, () => 'tried to sign in, not on the list')}
          accent
        />
        <Stat
          label="Unread"
          value={figure(messagesQuery, () => unhandled.length)}
          note={noteFor(messagesQuery, () => 'messages from the public')}
          accent
        />
        <Stat
          label="To review"
          value={figure(feedbackQuery, () => unapproved.length)}
          note={noteFor(feedbackQuery, () => 'feedback waiting for a decision')}
          accent
        />
        <Stat
          label="Came last time"
          value={figure(attendanceQuery, () => (lastCounted ? peopleAt(lastCounted) : '—'))}
          note={noteFor(attendanceQuery, () =>
            lastCounted ? `${lastCounted.households} households` : 'no count recorded yet',
          )}
        />
        <Stat
          label="Members"
          value={figure(householdsQuery, () => memberCount)}
          note={noteFor(householdsQuery, () => `${signedIn} have signed in, ${admins} admins`)}
        />
      </div>

      <div className={styles.two}>
        {lastCounted ? (
          <section className={styles.panel} aria-labelledby="fill-title">
            <div className={styles.panelHead}>
              <h2 id="fill-title" className={styles.panelTitle}>
                Last counted · {formatLongDate(lastCounted.heldOn)}
              </h2>
              <Button to="/admin/events" variant="line" size="sm">
                Record a count
              </Button>
            </div>
            <div className={styles.pad} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className={styles.stats}>
                <div>
                  <span className={styles.statLabel}>Households</span>
                  <p className={styles.statValue}>{lastCounted.households}</p>
                </div>
                <div>
                  <span className={styles.statLabel}>Adults</span>
                  <p className={styles.statValue}>{lastCounted.adults}</p>
                </div>
                <div>
                  <span className={styles.statLabel}>Children</span>
                  <p className={styles.statValue}>{lastCounted.children}</p>
                </div>
                <div>
                  <span className={styles.statLabel}>In all</span>
                  <p className={styles.statAccent}>{peopleAt(lastCounted)}</p>
                </div>
              </div>
              {/* Without the household count the bar would read 0%, which is a figure, not a gap. */}
              {householdsQuery.isSuccess ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div className={styles.rowBetween}>
                    <span className={`${styles.muted} ${styles.tiny}`}>
                      {lastCounted.households} of {memberCount} households
                    </span>
                    <span className={`${styles.muted} ${styles.tiny}`}>{filled}%</span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${filled}%` }} />
                  </div>
                </div>
              ) : null}
              <p className={`${styles.muted} ${styles.tiny}`}>
                Counts only — we do not keep which households came. Bookings stay in the committee's
                form.
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
          {decisionsPending ? (
            <p className={styles.empty} aria-busy="true">
              Loading…
            </p>
          ) : (attempts?.length ?? 0) + unhandled.length + unapproved.length === 0 ? (
            <p className={styles.empty}>
              {decisionsFailed
                ? 'Not everything could be read just now, so there may be things waiting that are not shown here.'
                : 'Nothing waiting.'}
            </p>
          ) : (
            <div className={styles.list}>
              {decisionsFailed ? (
                <p className={`${styles.pad} ${styles.muted} ${styles.tiny}`}>
                  Not everything could be read just now, so there may be more waiting than this.
                </p>
              ) : null}
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
              {/* Feedback waits on a judgement rather than a reply, which is why it is here
                  and not only behind its own badge: a queue nobody is reminded of is a queue
                  where somebody's note about the heating sits for a month. */}
              {unapproved.map((piece) => (
                <div key={piece.id} className={styles.listItem}>
                  <span className={styles.dot} />
                  <div className={styles.listBody}>
                    <strong>{piece.authorName ?? 'Anonymous'}</strong>
                    <span className={`${styles.muted} ${styles.tiny}`}>
                      Left feedback · {formatLongDate(piece.createdAt)} · not on the website yet
                    </span>
                  </div>
                  <Link to="/admin/feedback" className={styles.tiny}>
                    Read
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
