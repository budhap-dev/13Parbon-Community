import { useParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import { LoadFailed } from '@/components/LoadFailed'
import { useQuizzes } from '@/lib/api'
import portal from '@/features/portal/Portal.module.css'
import { QuizCardPanel } from './PlayPage'
import { QuizPlayer } from './QuizPlayer'
import styles from './Play.module.css'

/**
 * Quizzes the committee has opened to everyone.
 *
 * Only the public ones, even for a member who happens to be signed in: this is the website,
 * and the members' quizzes live in the portal. Nothing is asked of a visitor to play, and
 * nothing is kept about them afterwards beyond one more on the count.
 */
export function QuizzesPage() {
  useDocumentTitle('Quizzes')
  const { data, isPending, isError, refetch } = useQuizzes()
  const cards = (data ?? []).filter((card) => card.quiz.audience === 'public')

  return (
    <Container className={styles.public}>
      <header className={styles.publicHead}>
        <h1 className={styles.publicTitle}>Quizzes</h1>
        <p className={styles.publicIntro}>How well do you know the festivals? A few questions at a time — no sign-in, and nothing about you is kept.</p>
      </header>
      {isPending ? (
        <p className={portal.empty} aria-busy="true">
          Loading…
        </p>
      ) : isError ? (
        <LoadFailed what="the quizzes" onRetry={() => void refetch()} />
      ) : cards.length === 0 ? (
        <p className={portal.empty}>No quizzes just now. Come back around the next festival.</p>
      ) : (
        <div className={styles.quizCards}>
          {cards.map((card) => (
            <QuizCardPanel key={card.quiz.id} card={card} to={`/quizzes/${card.quiz.id}`} className={styles.publicCard} />
          ))}
        </div>
      )}
    </Container>
  )
}

export function QuizPage() {
  const { id = '' } = useParams()
  useDocumentTitle('Quiz')
  return (
    <Container className={styles.public}>
      <QuizPlayer id={id} backTo="/quizzes" backLabel="All quizzes" card />
    </Container>
  )
}
