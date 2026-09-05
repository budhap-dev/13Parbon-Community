import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import styles from '../Home.module.css'

/**
 * Membership is by invitation while the community gets started, so this asks people to
 * come to something rather than to fill in a form that does not exist.
 */
export function JoinCta() {
  return (
    <Container>
      <section className={styles.join} aria-labelledby="join-title">
        <div className={styles.joinBody}>
          <h2 id="join-title" className={styles.joinTitle}>
            Come for one evening.
          </h2>
          <p className={styles.joinText}>
            Everyone is welcome at our programmes, member or not. Come along, say hello, and if you would like to
            stay, talk to the committee.
          </p>
        </div>
        <div className={styles.joinActions}>
          <Button to="/events">See what’s on</Button>
          <Button to="/about" variant="line">
            Our story
          </Button>
        </div>
      </section>
    </Container>
  )
}
