import { Link } from 'react-router'
import { isPlaceholder } from '@/app/site'
import { useSettings } from '@/app/SettingsContext'
import { Container } from '@/components/Container'
import styles from '../Home.module.css'

export function WhoWeAre() {
  const { text } = useSettings()
  // Each figure is the committee's to give; one left in [brackets] or blank is left out.
  const figures = [
    { value: text.figureFounded, label: 'our first year' },
    { value: text.figureHouseholds, label: 'households' },
    { value: text.figureFestivals, label: 'festivals a year' },
  ].filter((figure) => figure.value.trim() && !isPlaceholder(figure.value))

  return (
    <div className={styles.band}>
      <Container>
        <section className={styles.who} aria-labelledby="who-title">
          <div className={styles.whoHead}>
            <p lang="bn" className={styles.kickerBn}>
              আমরা কারা
            </p>
            <h2 id="who-title" className={styles.whoTitle}>
              Who we are
            </h2>
            {figures.length > 0 ? (
              <dl className={styles.figures}>
                {figures.map((figure) => (
                  <div key={figure.label} className={styles.figure}>
                    <dt className={styles.figureLabel}>{figure.label}</dt>
                    <dd className={styles.figureValue}>{figure.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <div className={styles.whoBody}>
            <p>{text.mission}</p>
            {isPlaceholder(text.missionStatement) ? null : (
              <p className={styles.whoMuted}>{text.missionStatement}</p>
            )}
            <Link to="/about" className={styles.whoLink}>
              About the community and the committee
            </Link>
          </div>
        </section>
      </Container>
    </div>
  )
}
