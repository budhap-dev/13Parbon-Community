import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { daysUntil, describeCountdown, formatDateWithYear, formatLongDate, formatTime } from '@/domain/dates'
import { describeSize } from '@/domain/household'
import { useAnnouncements, useHousehold, useNextEvent, usePolls, useQuizzes } from '@/lib/api'
import { stateOf } from '@/domain/polls'
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
  const { data: polls } = usePolls()
  const { data: quizzes } = useQuizzes()

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

      {/*
        * Announcements are the reading, so they take the wide column; the household's own facts
        * sit beside them. Before, both stacked down the left two-thirds and the right third of
        * every screen was empty.
        */}
      <div className={styles.two}>
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
                  <span className={styles.listIcon}>
                    <Icon name="megaphone" size={17} />
                  </span>
                  <div className={styles.listBody}>
                    <strong>{a.title}</strong>
                    <span className={`${styles.muted} ${styles.tiny}`}>{a.body}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.pad}>
              <p className={styles.empty}>Nothing pinned right now.</p>
            </div>
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
                  {household.membership.paidTo ? (
                    <>
                      {household.membership.status === 'active' ? 'Runs to ' : 'Ran out '}
                      {formatDateWithYear(household.membership.paidTo)}.
                    </>
                  ) : (
                    // The status column defaults to active and the date column has no default,
                    // so every household the committee writes down arrives in exactly this
                    // state. Saying so beats a date nobody set, and beats taking the page down.
                    'No renewal date recorded yet.'
                  )}
                </p>
              </div>
            </section>
          ) : null}

          {household ? (
            <section className={styles.panel} aria-labelledby="household-title">
              <div className={styles.panelHead}>
                <h2 id="household-title" className={styles.panelTitle}>
                  {household.name}
                </h2>
                <Button to="/portal/household" variant="line" size="sm">
                  View
                </Button>
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>Who is in it</dt>
                  <dd>{describeSize(household)}</dd>
                </div>
                <div>
                  <dt>Main contact</dt>
                  <dd>{household.contactName}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{formatDateWithYear(household.memberSince)}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {(() => {
            /*
             * Only when there is something to do: a poll this household has not answered, or a
             * quiz it has not played. A panel saying "nothing open" every visit is a panel
             * people learn to skip, and then miss the week there is.
             */
            const poll = (polls ?? []).find((v) => v.myVote === undefined && stateOf(v.poll, now) === 'open')
            const quiz = (quizzes ?? []).find((c) => !c.played && stateOf(c.quiz, now) === 'open')
            if (!poll && !quiz) return null
            return (
              <section className={styles.panel} aria-labelledby="say-title">
                <div className={styles.pad}>
                  <p className={styles.statLabel}>Have your say</p>
                  <h2 id="say-title" className={styles.panelTitle} style={{ marginTop: 8 }}>
                    {poll ? poll.poll.title : quiz!.quiz.title}
                  </h2>
                  <p className={`${styles.muted} ${styles.tiny}`} style={{ marginTop: 6 }}>
                    {poll
                      ? quiz
                        ? 'Your household has not voted yet — and there is a quiz to play.'
                        : 'Your household has not voted yet.'
                      : `A quiz, ${quiz!.questionCount} questions. One go per household.`}
                  </p>
                  <div className={styles.actions} style={{ marginTop: 12 }}>
                    <Button to={poll ? '/portal/play' : `/portal/play/${quiz!.quiz.id}`} variant="gold" size="sm">
                      {poll ? 'Vote' : 'Play'}
                    </Button>
                  </div>
                </div>
              </section>
            )
          })()}

          <section className={styles.panel} aria-labelledby="help-title">
            <div className={styles.pad}>
              <h2 id="help-title" className={styles.panelTitle}>
                Something not right?
              </h2>
              <p className={`${styles.muted} ${styles.tiny}`} style={{ marginTop: 6 }}>
                A name spelt wrong, a renewal you have paid, a photograph you would rather was not up — the
                committee would like to know.
              </p>
              <div className={styles.actions} style={{ marginTop: 12 }}>
                <Button to="/contact" variant="line" size="sm">
                  Message the committee
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
