import { site } from '@/app/site'
import styles from './LogoAssembly.module.css'

/**
 * The 13Parbon logo, assembled on load: the Kolkata skyline arc drops in from above,
 * the city skyline rises from below, and the emblem pops into the middle to join them.
 * Reduced-motion users see the finished logo straight away.
 */
export function LogoAssembly() {
  return (
    <div className={styles.logo} role="img" aria-label={`${site.name} logo`}>
      <div className={styles.stage}>
        <img src="/brand/logo/arc.jpg" alt="" className={styles.arc} data-piece="arc" />
        <img src="/brand/logo/skyline.jpg" alt="" className={styles.skyline} data-piece="skyline" />
        <span className={styles.ring} aria-hidden="true" />
        <img src="/brand/logo/emblem.jpg" alt="" className={styles.emblem} data-piece="emblem" />
      </div>
    </div>
  )
}
