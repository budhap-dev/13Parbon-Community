import { Link } from 'react-router'
import { site } from '@/app/site'
import { Container } from '@/components/Container'
import styles from '../Home.module.css'

export function WhoWeAre() {
  return (
    <Container>
      <section className={styles.who} aria-labelledby="who-title">
        <h2 id="who-title" className={styles.whoTitle}>
          Who we are
        </h2>
        <div className={styles.whoBody}>
          <p>{site.mission}</p>
          <p className={styles.whoMuted}>{site.missionStatement}</p>
          <Link to="/about" className={styles.whoLink}>
            About the community and the committee
          </Link>
        </div>
      </section>
    </Container>
  )
}
