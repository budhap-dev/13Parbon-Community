import { site } from '@/app/site'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import styles from '../Home.module.css'

export function JoinCta() {
  return (
    <Container>
      <section className={styles.join} aria-labelledby="join-title">
        <div className={styles.joinBody}>
          <h2 id="join-title" className={styles.joinTitle}>
            Come for one evening.
          </h2>
          <p className={styles.joinText}>
            Stay for the whole year. Membership is {site.membershipFee} a year per household.
          </p>
        </div>
        <Button to="/join">Become a member</Button>
      </section>
    </Container>
  )
}
