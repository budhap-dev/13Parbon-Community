import { Link } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useSettings } from '@/app/SettingsContext'
import { countGaps, gapsNow } from '@/app/gaps'
import { Button } from '@/components/Button'
import { LoadFailed } from '@/components/LoadFailed'
import { daysUntil, formatLongDate, formatTime } from '@/domain/dates'
import { peopleAt } from '@/domain/attendance'
import { unresolved } from '@/domain/document'
import { waiting } from '@/domain/feedback'
import { useAllEvents, useAllFeedback, useAttendance, useContactMessages, useHouseholds, useSignInAttempts } from '@/lib/api'
import { useSignedIn } from '@/lib/auth/session'
import { useNow } from '@/lib/clock'
import styles from '@/features/portal/Portal.module.css'

/**
 * One of the four things that can be waiting, as a link to the screen that deals with it. The
 * amber edge is only there while something is: four lit tiles every day stop being read.
 */
function Tile({ to, label, value, note, count }: { to: string; label: string; value: string | number; note: string; count?: number }) {
  return (
    <Link to={to} className={count ? styles.tileOn : styles.tile}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statNote}>{note}</span>
    </Link>
  )
}

/** "Good morning" by the clock in the room, which is the one the committee is reading it by. */
const greetingAt = (now: Date) => (now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening')

/**
 * What a figure shows until it is known. A 0 here reads as "nobody is waiting", which is an
 * answer, so a figure that has not arrived — or never will — must not look like one.
 */
type Read = { isPending: boolean; isError: boolean }
/** "1 household", "8 households". */
const countOf = (n: number) => `${n} ${n === 1 ? 'household' : 'households'}`
const LOADING = '…'
const FAILED = '—'
const figure = (query: Read, value: () => string | number) =>
  query.isPending ? LOADING : query.isError ? FAILED : value()
const noteFor = (query: Read, note: () => string) =>
  query.isPending ? 'loading' : query.isError ? 'could not be loaded' : note()

export function AdminOverviewPage() {
  useDocumentTitle('Committee overview')
  const who = useSignedIn()
  const now = useNow()
  const settings = useSettings()
  const householdsQuery = useHouseholds()
  const attemptsQuery = useSignInAttempts()
  const messagesQuery = useContactMessages()
  const attendanceQuery = useAttendance()
  const feedbackQuery = useAllFeedback()
  const eventsQuery = useAllEvents()
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
  const gaps = countGaps(gapsNow(settings))

  const queries = [householdsQuery, attemptsQuery, messagesQuery, attendanceQuery, feedbackQuery, eventsQuery]
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
  const decisions = (attempts?.length ?? 0) + unhandled.length + unapproved.length

  /** The next evening on the calendar, drafts included: a draft three days out is the news. */
  const next = (eventsQuery.data ?? [])
    .filter((e) => e.status !== 'past' && e.status !== 'cancelled' && daysUntil(e.startsAt, now) >= 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const daysLeft = next ? daysUntil(next.startsAt, now) : undefined

  const summary = [
    // No count from a queue that failed: a figure that could not be read must not pass for 0.
    decisionsPending || decisionsFailed ? null : decisions === 0 ? 'Nothing needs you.' : `${decisions} ${decisions === 1 ? 'thing needs' : 'things need'} you.`,
    next ? `${next.title} is next.` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>
            {greetingAt(now)}, {who?.name.split(' ')[0]}
          </h1>
          <p className={styles.sub}>{summary || 'Reading what is waiting…'}</p>
        </div>
      </div>

      {failed.length > 0 ? <LoadFailed what="some of these figures" onRetry={retry} /> : null}

      <div className={styles.tiles} aria-busy={queries.some((q) => q.isPending) || undefined}>
        <Tile
          to="/admin/people"
          label="Waiting on you"
          value={figure(knocks, () => attempts?.length ?? 0)}
          count={attempts?.length}
          note={noteFor(knocks, () => 'tried to sign in, not on the list')}
        />
        <Tile
          to="/admin/messages"
          label="Unread"
          value={figure(messagesQuery, () => unhandled.length)}
          count={unhandled.length}
          note={noteFor(messagesQuery, () => 'messages from the public')}
        />
        <Tile
          to="/admin/feedback"
          label="To review"
          value={figure(feedbackQuery, () => unapproved.length)}
          count={unapproved.length}
          note={noteFor(feedbackQuery, () => 'feedback waiting for a decision')}
        />
        <Tile
          to="/admin/content"
          label="Gaps showing"
          value={gaps}
          count={gaps}
          note="lines left in [brackets] to fill in"
        />
      </div>

      <div className={styles.two}>
        <section className={styles.panel} aria-labelledby="decide-title">
          <div className={styles.panelHead}>
            <h2 id="decide-title" className={styles.panelTitle}>
              Needs a decision
            </h2>
          </div>
          {decisionsPending ? (
            <div className={styles.list} aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.listItem}>
                  <span className={styles.skeleton} />
                </div>
              ))}
            </div>
          ) : decisions === 0 ? (
            <p className={styles.emptyQuiet}>
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
                <div key={attempt.id} className={styles.decision}>
                  <span className={styles.pillWait}>Sign-in</span>
                  <span className={styles.decisionLine}>
                    <strong>{attempt.email}</strong>{' '}
                    <span className={styles.muted}>
                      tried {attempt.attempts === 1 ? 'once' : `${attempt.attempts} times`}, not on the list
                    </span>
                  </span>
                  <Button to="/admin/people" variant="line" size="sm">
                    Add<span className="sr-only"> a household for {attempt.email}</span>
                  </Button>
                </div>
              ))}
              {/* Feedback waits on a judgement rather than a reply, which is why it is here
                  and not only behind its own badge: a queue nobody is reminded of is a queue
                  where somebody's note about the heating sits for a month. */}
              {unapproved.map((piece) => (
                <div key={piece.id} className={styles.decision}>
                  <span className={styles.pillWait}>Feedback</span>
                  <span className={styles.decisionLine}>
                    <strong>{piece.authorName ?? 'Anonymous'}</strong>{' '}
                    <span className={styles.muted}>· {formatLongDate(piece.createdAt)} · not on the website yet</span>
                  </span>
                  <Button to="/admin/feedback" variant="line" size="sm">
                    Read<span className="sr-only"> the feedback from {piece.authorName ?? 'Anonymous'}</span>
                  </Button>
                </div>
              ))}
              {unhandled.map((message) => (
                <div key={message.id} className={styles.decision}>
                  <span className={styles.pillWait}>Message</span>
                  <span className={styles.decisionLine}>
                    <strong>{message.subject}</strong>{' '}
                    <span className={styles.muted}>
                      · from {message.name} · {formatLongDate(message.createdAt)}
                    </span>
                  </span>
                  <Button to="/admin/messages" variant="line" size="sm">
                    Open<span className="sr-only"> the message from {message.name}</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className={styles.stack}>
          <section className={styles.nextCard} aria-labelledby="next-title">
            <p className={styles.eyebrow}>Next event</p>
            {eventsQuery.isPending ? (
              <span className={styles.skeleton} aria-busy="true" />
            ) : eventsQuery.isError ? (
              <>
                <h2 id="next-title" className={styles.panelTitle}>
                  The calendar could not be read
                </h2>
                <Button onClick={() => void eventsQuery.refetch()} variant="line" size="sm">
                  Try again
                </Button>
              </>
            ) : next && daysLeft !== undefined ? (
              <>
                <h2 id="next-title" className={styles.panelTitle}>
                  {next.title}
                </h2>
                <p className={styles.nextDays}>
                  <span className={styles.statValue}>{daysLeft === 0 ? 'Today' : daysLeft}</span>
                  {daysLeft === 0 ? null : <span className={styles.muted}>{daysLeft === 1 ? 'day left' : 'days left'}</span>}
                </p>
                <p className={`${styles.muted} ${styles.tiny}`}>
                  {formatLongDate(next.startsAt)}, {formatTime(next.startsAt)} · {next.venue}
                </p>
                <p>
                  <span className={next.status === 'published' ? styles.pillLive : styles.pillWait}>
                    {next.status === 'published' ? 'On the website' : 'Not on the website yet'}
                  </span>
                </p>
                <Button to={`/admin/events?open=${next.id}`} variant="line" size="sm">
                  Open the event<span className="sr-only">: {next.title}</span>
                </Button>
              </>
            ) : (
              <>
                <h2 id="next-title" className={styles.panelTitle}>
                  Nothing on the calendar
                </h2>
                <Button to="/admin/events" variant="gold" size="sm">
                  Add an event
                </Button>
              </>
            )}
          </section>

          {lastCounted ? (
            <section className={styles.panel} aria-labelledby="fill-title">
              <div className={styles.panelHead}>
                <h2 id="fill-title" className={styles.panelTitle}>
                  Last counted · {formatLongDate(lastCounted.heldOn)}
                </h2>
              </div>
              {/* Counts only — we do not keep which households came. */}
              <dl className={styles.figures}>
                <div>
                  <dt className={styles.statLabel}>Households</dt>
                  <dd className={styles.statValue}>{lastCounted.households}</dd>
                </div>
                <div>
                  <dt className={styles.statLabel}>Adults</dt>
                  <dd className={styles.statValue}>{lastCounted.adults}</dd>
                </div>
                <div>
                  <dt className={styles.statLabel}>Children</dt>
                  <dd className={styles.statValue}>{lastCounted.children}</dd>
                </div>
                <div>
                  <dt className={styles.statLabel}>In all</dt>
                  <dd className={styles.statAccent}>{peopleAt(lastCounted)}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </div>
      </div>

      <p className={`${styles.muted} ${styles.tiny}`}>
        Members: {figure(householdsQuery, () => countOf(memberCount))}
        {householdsQuery.isSuccess ? ` (${signedIn} have signed in, ${admins} admins)` : ''} · Came last time:{' '}
        {figure(attendanceQuery, () =>
          lastCounted ? `${peopleAt(lastCounted)} people from ${countOf(lastCounted.households)}` : 'no count yet',
        )}
      </p>
    </div>
  )
}
