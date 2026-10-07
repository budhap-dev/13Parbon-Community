import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import { attributionOf } from '@/domain/feedback'
import { useApprovedFeedback } from '@/lib/api'
import styles from '../Home.module.css'

/**
 * A few words from people who came, on the way down the home page.
 *
 * Three at most, and the newest three rather than a chosen few: picking favourites turns a
 * page of what people said into a page of what the committee liked being told, and the whole
 * value of this section is that a stranger reading it believes it.
 *
 * Nothing here has escaped review — `listApproved` is the only query on the public side, and
 * the database will not hand over anything else. This renders nothing at all until there is
 * something approved, so a committee that has turned the section on before working through
 * the queue gets an unchanged home page rather than an empty heading.
 */
export function FeedbackStrip() {
  const { data: pieces } = useApprovedFeedback(3)

  if (!pieces || pieces.length === 0) return null

  return (
    <Container>
      <section className={styles.saying} aria-labelledby="saying-title">
        <SectionHeading
          id="saying-title"
          title="What people say"
          action={{ label: 'Read more, or tell us', to: '/feedback' }}
        />
        <ul className={styles.sayings}>
          {pieces.map((piece) => (
            <li key={piece.id} className={styles.saysCard}>
              <blockquote className={styles.saysQuote}>{piece.message}</blockquote>
              <p className={styles.saysBy}>{attributionOf(piece)}</p>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  )
}
