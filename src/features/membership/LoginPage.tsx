import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import styles from './Membership.module.css'

/**
 * The member portal is not open yet. When it is, signing in will be Google only, and only
 * for households the committee has added: nobody creates an account for themselves.
 */
export function LoginPage() {
  useDocumentTitle('Member sign-in')
  return (
    <Container className={styles.single}>
      <h1 className={styles.title}>
        Member <span className={styles.nowrap}>sign-in</span>
      </h1>
      <p className={styles.intro}>
        The member portal is not open yet. When it is, members will sign in with Google to see their household,
        their registrations and the documents library.
      </p>
      <p className={styles.intro}>
        Membership is by invitation while we get started, so there is no sign-up form. If you would like to join
        {site.town.startsWith('[') ? ' the community' : ` us in ${site.town}`}, send the committee a message and
        someone will be in touch.
      </p>
      <div className={styles.cta}>
        <Button to="/contact">Message the committee</Button>
        <Button to="/events" variant="line">
          What’s on
        </Button>
      </div>
    </Container>
  )
}
