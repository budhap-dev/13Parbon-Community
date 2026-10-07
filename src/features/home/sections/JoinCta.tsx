import { useSettings } from '@/app/SettingsContext'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import styles from '../Home.module.css'

/**
 * Membership is by invitation while the community gets started, so this asks people to
 * come to something rather than to fill in a form that does not exist.
 */
export function JoinCta() {
  const { text } = useSettings()
  return (
    <Container>
      <section className={styles.join} aria-labelledby="join-title">
        <div className={styles.joinBody}>
          <h2 id="join-title" className={styles.joinTitle}>
            {text.joinTitle}
          </h2>
          <p className={styles.joinText}>{text.joinText}</p>
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
