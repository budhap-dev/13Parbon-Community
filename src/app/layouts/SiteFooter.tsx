import { Link } from 'react-router'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { useSiteText } from '@/lib/api'
import { footerNav } from '../nav'
import { site } from '../site'
import styles from './PublicLayout.module.css'

export function SiteFooter() {
  const text = useSiteText()
  return (
    <footer className={styles.footer}>
      <Container className={styles.footerGrid}>
        <p className={styles.footerText}>
          {site.name} · {text.town}
        </p>
        <ul className={styles.footerLinks}>
          {footerNav.map((item) => (
            <li key={item.label}>
              <Link to={item.to}>{item.label}</Link>
            </li>
          ))}
        </ul>
        <ul className={styles.social}>
          {site.social.map((channel) => (
            <li key={channel.name}>
              <a href={channel.href} aria-label={channel.name}>
                <Icon name={channel.icon} size={22} />
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  )
}
