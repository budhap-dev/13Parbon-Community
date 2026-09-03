import { useLocation } from 'react-router'
import { site } from '@/app/site'
import { Backdrop } from '@/app/theme/backdrops'
import { useTheme } from '@/app/theme/ThemeContext'
import { themes } from '@/app/theme/themes'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { LogoAssembly } from '../LogoAssembly'
import styles from '../Home.module.css'

export function Hero() {
  const { theme } = useTheme()
  const { key: navigationKey } = useLocation()
  const heroImage = themes.find((t) => t.id === theme)?.heroImage

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      {heroImage ? (
        <div className={styles.heroImage} style={{ backgroundImage: `url(${heroImage})` }} aria-hidden="true" />
      ) : null}
      <Backdrop theme={theme} className={styles.backdrop} />
      <Container className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <h1 id="hero-title" className={styles.heroTitle}>
            <span lang="bn" className={styles.heroTitleLead}>
              {site.bengaliTitleLead}
            </span>{' '}
            <span className={styles.heroTitleName}>{site.groupName}</span>
          </h1>
          <p className={styles.lead}>{site.tagline}</p>
          <div className={styles.heroActions}>
            <Button to="/events" variant="cream">
              What’s on
            </Button>
            <Button to="/about" variant="line">
              Our story
            </Button>
          </div>
        </div>
        <div className={styles.heroLogo}>
          {/* Remounting restarts the CSS animation: on every arrival at home and on each theme change. */}
          <LogoAssembly key={`${theme}:${navigationKey}`} />
        </div>
      </Container>
    </section>
  )
}
