import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import styles from './Membership.module.css'

/** Placeholder until phase 2 brings real accounts. Honest about what exists today. */
export function LoginPage() {
  useDocumentTitle('Member login')
  return (
    <Container className={styles.single}>
      <h1 className={styles.title}>Member login</h1>
      <p className={styles.intro}>
        The member portal is not open yet. When it is, this is where members will sign in to see their registrations, the
        directory and the documents library.
      </p>
      <p className={styles.intro}>
        Until then, register for events from the event page and reach the committee through the contact form.
      </p>
      <div className={styles.cta}>
        <Button to="/join">Apply to join</Button>
        <Button to="/events" variant="line">
          What’s on
        </Button>
      </div>
    </Container>
  )
}
