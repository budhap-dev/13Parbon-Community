import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { LoadFailed } from '@/components/LoadFailed'
import { formatLongDate } from '@/domain/dates'
import { stateOf } from '@/domain/polls'
import { scoreLine, QUIZ_AUDIENCE, type QuizCard } from '@/domain/quizzes'
import { SUGGESTION_STATUS } from '@/domain/suggestions'
import { useMySuggestions, usePolls, useQuizzes, useSendSuggestion, useViewer } from '@/lib/api'
import { can } from '@/lib/auth/permissions'
import { useSignedIn } from '@/lib/auth/session'
import { useNow } from '@/lib/clock'
import portal from '@/features/portal/Portal.module.css'
import { PollCard } from './PollCard'
import { SuggestionForm } from './PlayForms'
import { QuizPlayer } from './QuizPlayer'
import styles from './Play.module.css'

/**
 * Polls and quizzes, for a member household.
 *
 * The committee writes both; this is where a household answers them, and where it can suggest
 * the next one. Nothing here is visible to another household except a leaderboard name the
 * household chose to show.
 */
export function PlayPage() {
  useDocumentTitle('Polls and quizzes')
  const viewer = useViewer()
  const who = useSignedIn()
  const now = useNow()
  const polls = usePolls()
  const quizzes = useQuizzes()
  const mine = useMySuggestions()
  const send = useSendSuggestion()
  const [suggesting, setSuggesting] = useState(false)
  const [sent, setSent] = useState(false)
  const hasHousehold = Boolean(viewer?.householdId)
  const canVote = hasHousehold && can(viewer, 'play:vote')

  const views = polls.data ?? []
  const open = views.filter((v) => stateOf(v.poll, now) === 'open')
  const closed = views.filter((v) => stateOf(v.poll, now) !== 'open')

  return (
    <div className={portal.page}>
      <div className={portal.top}>
        <div>
          <h1 className={portal.title}>Polls and quizzes</h1>
          <p className={portal.sub}>Have your say on what the committee is planning, and test what you know. One vote and one go per household.</p>
        </div>
      </div>

      {!hasHousehold ? (
        <p className={portal.note}>
          <strong>This account has no household yet,</strong> so it can see the polls and quizzes but not vote or play as anybody.
        </p>
      ) : null}

      <div className={portal.two}>
        <div className={portal.stack}>
          <h2 className={portal.panelTitle}>Polls</h2>
          {polls.isPending ? (
            <p className={portal.empty} aria-busy="true">
              Loading…
            </p>
          ) : polls.isError ? (
            <LoadFailed what="the polls" onRetry={() => void polls.refetch()} />
          ) : views.length === 0 ? (
            <p className={portal.empty}>No polls at the moment.</p>
          ) : (
            <>
              {open.length === 0 ? <p className={portal.empty}>Nothing open just now.</p> : null}
              {open.map((view) => (
                <PollCard key={view.poll.id} view={view} canVote={canVote} />
              ))}
              {closed.length > 0 ? (
                <details>
                  <summary className={portal.muted} style={{ cursor: 'pointer', marginBottom: 12 }}>
                    Closed polls ({closed.length})
                  </summary>
                  <div className={portal.stack}>
                    {closed.map((view) => (
                      <PollCard key={view.poll.id} view={view} canVote={false} />
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          )}
        </div>

        <div className={portal.stack}>
          <h2 className={portal.panelTitle}>Quizzes</h2>
          {quizzes.isPending ? (
            <p className={portal.empty} aria-busy="true">
              Loading…
            </p>
          ) : quizzes.isError ? (
            <LoadFailed what="the quizzes" onRetry={() => void quizzes.refetch()} />
          ) : (quizzes.data ?? []).length === 0 ? (
            <p className={portal.empty}>No quizzes at the moment.</p>
          ) : (
            (quizzes.data ?? []).map((card) => <QuizCardPanel key={card.quiz.id} card={card} to={`/portal/play/${card.quiz.id}`} />)
          )}

          <section className={portal.panel} aria-labelledby="suggest-title">
            <div className={portal.panelHead}>
              <h2 id="suggest-title" className={portal.panelTitle}>
                Got an idea?
              </h2>
            </div>
            <div className={portal.pad} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {suggesting ? (
                <SuggestionForm
                  householdName={who?.householdName}
                  sending={send.isPending}
                  error={send.isError ? send.error.message : undefined}
                  onCancel={() => setSuggesting(false)}
                  onSend={(draft) =>
                    send.mutate(draft, {
                      onSuccess: () => {
                        setSuggesting(false)
                        setSent(true)
                      },
                    })
                  }
                />
              ) : (
                <>
                  <p className={portal.muted}>Suggest a quiz question or a poll. The committee reads every one before anything goes up.</p>
                  {sent ? (
                    <p className={portal.note} role="status">
                      Thank you — it is with the committee.
                    </p>
                  ) : null}
                  <div>
                    <Button
                      variant="line"
                      size="sm"
                      disabled={!hasHousehold || !can(viewer, 'play:suggest')}
                      onClick={() => {
                        setSent(false)
                        setSuggesting(true)
                      }}
                    >
                      Suggest a question or poll
                    </Button>
                  </div>
                </>
              )}
              {(mine.data ?? []).length > 0 ? (
                <div>
                  <p className={portal.eyebrow} style={{ marginBottom: 8 }}>
                    Your suggestions
                  </p>
                  <ul className={portal.plainList}>
                    {(mine.data ?? []).map((s) => (
                      <li key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 0' }}>
                        <span>{s.prompt}</span>
                        <span className={`${portal.muted} ${portal.tiny}`}>
                          {s.kind === 'question' ? 'Question' : 'Poll'} · {formatLongDate(s.createdAt)} · {SUGGESTION_STATUS[s.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/** One quiz in a list: what it is, how long, and the household's score once played. */
export function QuizCardPanel({ card, to, className }: { card: QuizCard; to: string; className?: string }) {
  const { quiz, questionCount, played } = card
  const now = useNow()
  const closed = stateOf(quiz, now) === 'closed'
  return (
    <article className={`${className ?? portal.panel} ${styles.quizCard}`}>
      <p className={portal.eyebrow}>{QUIZ_AUDIENCE[quiz.audience].split(',')[0]}</p>
      <h3 className={styles.quizCardTitle}>{quiz.title}</h3>
      {quiz.intro ? <p className={portal.muted}>{quiz.intro}</p> : null}
      <div className={styles.quizCardFoot}>
        <span className={`${portal.muted} ${portal.tiny}`}>
          {questionCount} {questionCount === 1 ? 'question' : 'questions'}
          {quiz.closesAt && !closed ? ` · until ${formatLongDate(quiz.closesAt)}` : ''}
        </span>
        {played ? (
          <Link to={to} className={portal.pillLive}>
            Scored {scoreLine(played.score, played.total)}
          </Link>
        ) : closed ? (
          <span className={portal.pillPast}>Closed</span>
        ) : (
          <Button to={to} variant="gold" size="sm">
            Play
          </Button>
        )}
      </div>
    </article>
  )
}

/** One quiz, played inside the portal. */
export function PortalQuizPage() {
  const { id = '' } = useParams()
  useDocumentTitle('Quiz')
  return (
    <div className={portal.page}>
      <QuizPlayer id={id} backTo="/portal/play" backLabel="Polls and quizzes" />
    </div>
  )
}
