import { useLocation } from 'react-router'
import { site } from '@/app/site'
import { useSettings } from '@/app/SettingsContext'
import { Backdrop } from '@/app/theme/backdrops'
import { useTheme } from '@/app/theme/ThemeContext'
import { themes } from '@/app/theme/themes'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { useFestivals, useNextEvent } from '@/lib/api'
import { LogoAssembly } from '../LogoAssembly'
import { HeroTicket } from './NextEvent'
import styles from '../Home.module.css'

export function Hero() {
  const { text } = useSettings()
  const { theme } = useTheme()
  const { key: navigationKey } = useLocation()
  const heroImage = themes.find((t) => t.id === theme)?.heroImage
  const { data: next } = useNextEvent()
  const { data: festivals } = useFestivals()
  const nextName = next ? (festivals?.find((f) => f.id === next.festivalId)?.name ?? next.title) : null

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      {heroImage ? (
        <div className={styles.heroImage} style={{ backgroundImage: `url(${heroImage})` }} aria-hidden="true" />
      ) : null}
      <Backdrop theme={theme} className={styles.backdrop} />
      <Container className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <div className={styles.heroTitleRow}>
          <h1 id="hero-title" className={styles.heroTitle}>
            {text.heroLead ? (
              <>
                <span lang="bn" className={styles.heroTitleLead}>
                  {text.heroLead}
                </span>{' '}
              </>
            ) : null}
            <span className={styles.heroTitleName}>{text.heroName}</span>
          </h1>
            {/* On a phone the assembled logo would push everything below the fold; the emblem
                sits beside the name instead. */}
            <img src={site.emblem} alt="" className={styles.heroEmblem} width={96} height={96} />
          </div>
          <p className={styles.lead}>
            {text.tagline}
            <Icon name="sparkle" size={22} className={styles.leadSparkle} />
          </p>
          <div className={styles.heroDeck}>
            <div className={styles.heroActions}>
              {next ? (
                <Button to={`/events/${next.slug}`}>Come to {nextName}</Button>
              ) : (
                <Button to="/events">See what’s on</Button>
              )}
              <Button to="/about" variant="line">
                Our story
              </Button>
            </div>
            <HeroTicket />
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
