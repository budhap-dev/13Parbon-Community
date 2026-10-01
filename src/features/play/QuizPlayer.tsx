import { useState } from 'react'
import { Link } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { Button } from '@/components/Button'
import { LoadFailed } from '@/components/LoadFailed'
import { stateOf } from '@/domain/polls'
import { scoreLine, verdict, type LeaderRow, type QuizResult } from '@/domain/quizzes'
import { useLeaderboard, useQuiz, useQuizzes, useSubmitQuiz, useViewer } from '@/lib/api'
import { useNow } from '@/lib/clock'
import portal from '@/features/portal/Portal.module.css'
import styles from './Play.module.css'

const LETTERS = 'ABCDEF'

/**
 * Playing one quiz: a question at a time, then the score, the right answers, and — for a
 * member household — the leaderboard.
 *
 * The same component on the public page and in the portal. What changes is who is asking,
 * which it reads for itself: a member who opens a public quiz from the website plays as their
 * household, is asked about the leaderboard, and can only play it once, exactly as in the portal.
 *
 * The right answers are not on the page until the score is. They come back from marking, and
 * nothing before that knows them — so there is nothing in the page to peek at.
 */
export function QuizPlayer({ id, backTo, backLabel, card }: { id: string; backTo: string; backLabel: string; card?: boolean }) {
  const viewer = useViewer()
  const now = useNow()
  const { showMemberSignIn } = useSettings()
  const member = Boolean(viewer?.householdId)
  const { data, isPending, isError, refetch } = useQuiz(id)
  const { data: cards } = useQuizzes()
  const submit = useSubmitQuiz()
  const [at, setAt] = useState(0)
  const [answers, setAnswers] = useState<(number | undefined)[]>([])
  const [showName, setShowName] = useState(true)
  const [result, setResult] = useState<QuizResult | null>(null)

  const played = cards?.find((c) => c.quiz.id === id)?.played
  const finished = Boolean(result || played)
  const board = useLeaderboard(id, member && finished)
  const box = card ? `${styles.publicCard} ${styles.playerCard}` : `${portal.panel} ${styles.playerCard}`

  const back = (
    <Link to={backTo} className={portal.inlineLink}>
      ← {backLabel}
    </Link>
  )

  if (isPending) {
    return (
      <p className={portal.empty} aria-busy="true">
        Loading…
      </p>
    )
  }
  if (isError) return <LoadFailed what="this quiz" onRetry={() => void refetch()} />
  if (!data) {
    return (
      <div className={styles.player}>
        {back}
        <p className={portal.empty}>This quiz is not here — it may have closed, or be for members only.</p>
      </div>
    )
  }

  const { quiz, questions } = data
  const state = stateOf(quiz, now)
  const total = questions.length
  const question = questions[at]
  const chosen = answers[at]
  const allAnswered = questions.every((_, i) => answers[i] !== undefined)

  const header = (
    <header className={styles.publicHead}>
      {back}
      <h1 className={card ? styles.publicTitle : portal.title}>{quiz.title}</h1>
      {quiz.intro ? <p className={card ? styles.publicIntro : portal.sub}>{quiz.intro}</p> : null}
    </header>
  )

  // Already played, from another visit: the score, and the board, but no second go.
  if (played && !result) {
    return (
      <div className={styles.player}>
        {header}
        <section className={box} aria-label="Your score">
          <p className={portal.eyebrow}>Your household’s score</p>
          <p className={styles.score}>{scoreLine(played.score, played.total)}</p>
          <p className={portal.muted}>One go per household, and yours has been played. {verdict(played.score, played.total)}</p>
        </section>
        <Leaderboard rows={board.data} loading={board.isPending} box={box} />
      </div>
    )
  }

  if (result) {
    return (
      <div className={styles.player}>
        {header}
        <section className={box} aria-labelledby="score-title">
          <p id="score-title" className={portal.eyebrow}>
            {member ? 'Your household’s score' : 'Your score'}
          </p>
          <p className={styles.score} role="status">
            {scoreLine(result.score, result.total)}
          </p>
          <p className={portal.muted}>{verdict(result.score, result.total)}</p>
        </section>

        <section className={box} aria-labelledby="answers-title">
          <h2 id="answers-title" className={portal.panelTitle}>
            The answers
          </h2>
          <ol className={styles.review}>
            {questions.map((q, i) => {
              const right = result.correct[i]
              const theirs = answers[i]
              return (
                <li key={q.id}>
                  <p className={styles.reviewPrompt}>
                    {i + 1}. {q.prompt}
                  </p>
                  <div className={styles.choices}>
                    {q.options.map((option, n) =>
                      n === right || n === theirs ? (
                        <div key={n} className={`${styles.choice} ${n === right ? styles.choiceRight : styles.choiceWrong}`}>
                          <span className={styles.letter} aria-hidden="true">
                            {LETTERS[n]}
                          </span>
                          <span className={styles.choiceText}>{option}</span>
                          <span className={styles.mark}>
                            {n === right ? (n === theirs ? 'Right — your answer' : 'The right answer') : 'Your answer'}
                          </span>
                        </div>
                      ) : null,
                    )}
                  </div>
                  {result.explanations[i] ? <p className={styles.explain}>{result.explanations[i]}</p> : null}
                </li>
              )
            })}
          </ol>
        </section>

        {member ? (
          <Leaderboard rows={board.data} loading={board.isPending} box={box} />
        ) : showMemberSignIn ? (
          <p className={portal.note}>
            Members can <Link to="/login" className={portal.inlineLink}>sign in</Link> to put their household on the
            leaderboard.
          </p>
        ) : null}
      </div>
    )
  }

  if (state === 'closed') {
    return (
      <div className={styles.player}>
        {header}
        <p className={portal.empty}>This quiz has closed.</p>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className={styles.player}>
        {header}
        <p className={portal.empty}>This quiz has no questions yet.</p>
      </div>
    )
  }

  const preview = state !== 'open'

  return (
    <div className={styles.player}>
      {header}
      {preview ? (
        <p className={portal.note}>
          <strong>A preview.</strong> This quiz is not open yet, so it cannot be marked — only the committee can see it.
        </p>
      ) : null}

      <section className={box} aria-labelledby="question-title">
        <div className={styles.progress} aria-hidden="true">
          {questions.map((q, i) => (
            <span key={q.id} className={`${styles.step} ${answers[i] !== undefined ? styles.stepDone : ''}`} />
          ))}
        </div>
        <p className={portal.eyebrow}>
          Question {at + 1} of {total}
        </p>
        <h2 id="question-title" className={styles.prompt}>
          {question.prompt}
        </h2>
        {question.imageUrl ? <img className={styles.picture} src={question.imageUrl} alt="" /> : null}

        <div className={styles.choices} role="group" aria-labelledby="question-title">
          {question.options.map((option, n) => (
            <button
              key={n}
              type="button"
              className={`${styles.choice} ${chosen === n ? styles.choiceOn : ''}`}
              aria-pressed={chosen === n}
              onClick={() => setAnswers((all) => Object.assign([...all], { [at]: n }))}
            >
              <span className={styles.letter} aria-hidden="true">
                {LETTERS[n]}
              </span>
              <span className={styles.choiceText}>{option}</span>
            </button>
          ))}
        </div>

        {question.creditedTo ? <p className={`${portal.muted} ${portal.tiny}`}>Suggested by {question.creditedTo}.</p> : null}

        {at === total - 1 && member ? (
          <label className={portal.muted} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
            <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              Show our household on the leaderboard. Untick to appear as “a household” — the committee still sees your score.
            </span>
          </label>
        ) : null}

        <div className={styles.row}>
          <Button variant="line" size="sm" disabled={at === 0} onClick={() => setAt(at - 1)}>
            Back
          </Button>
          {at < total - 1 ? (
            <Button variant="gold" size="sm" disabled={chosen === undefined} onClick={() => setAt(at + 1)}>
              Next question
            </Button>
          ) : (
            <Button
              variant="gold"
              size="sm"
              disabled={!allAnswered || submit.isPending || preview}
              onClick={() =>
                submit.mutate(
                  { id, answers: answers.map((a) => a ?? -1), showName: member && showName },
                  { onSuccess: setResult },
                )
              }
            >
              {submit.isPending ? 'Marking…' : 'Finish and see the answers'}
            </Button>
          )}
        </div>
        {submit.isError ? (
          <p className={portal.note} role="alert">
            {submit.error.message}
          </p>
        ) : null}
      </section>
    </div>
  )
}

/**
 * Everybody who played, in order, so a place on it means what it says. A household that chose
 * not to be shown keeps its place and loses its name.
 */
function Leaderboard({ rows, loading, box }: { rows?: LeaderRow[]; loading: boolean; box: string }) {
  const list = rows ?? []
  return (
    <section className={box} aria-labelledby="board-title">
      <h2 id="board-title" className={portal.panelTitle}>
        Leaderboard
      </h2>
      {loading ? (
        <p className={portal.muted} aria-busy="true">
          Loading…
        </p>
      ) : list.length === 0 ? (
        <p className={portal.muted}>Nobody has played yet.</p>
      ) : (
        <ol className={styles.board}>
          {list.map((row, i) => (
            <li key={i}>
              <span className={styles.place}>{i + 1}</span>
              <span className={`${styles.boardName} ${row.household ? '' : portal.muted}`}>
                {row.household ?? 'A household'}
              </span>
              <strong>{scoreLine(row.score, row.total)}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
