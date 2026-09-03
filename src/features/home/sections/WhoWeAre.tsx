import { Link } from 'react-router'
import { Container } from '@/components/Container'
import { useSiteText } from '@/lib/api'
import styles from '../Home.module.css'

export function WhoWeAre() {
  const text = useSiteText()
  return (
    <Container>
      <section className={styles.who} aria-labelledby="who-title">
        <h2 id="who-title" className={styles.whoTitle}>
          Who we are
        </h2>
        <div className={styles.whoBody}>
          <p>{text.mission}</p>
          <p className={styles.whoMuted}>{text.missionStatement}</p>
          <Link to="/about" className={styles.whoLink}>
            About the community and the committee
          </Link>
        </div>
      </section>
    </Container>
  )
}
