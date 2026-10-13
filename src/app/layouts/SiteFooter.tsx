import { Link } from 'react-router'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { formatDayLongMonth } from '@/domain/dates'
import { useNextEvent } from '@/lib/api'
import { footerNav } from '../nav'
import { linkedSocial } from '@/domain/siteContent'
import { isPlaceholder, site } from '../site'
import { useSettings } from '../SettingsContext'
import styles from './PublicLayout.module.css'

/** A line the committee has filled in, or nothing: a bracketed placeholder is never shown. */
function given(value: string): string | null {
  return value.trim() && !isPlaceholder(value) ? value : null
}

export function SiteFooter() {
  const settings = useSettings()
  const { text } = settings
  const social = linkedSocial(settings.social)
  const signOff = given(text.signOff)
  const email = given(text.email)
  const { data: next } = useNextEvent()

  return (
    <footer className={styles.footer}>
      <Container className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <img src={site.emblem} alt="" width={64} height={64} className={styles.footerEmblem} />
          <div>
            {signOff ? (
              <p lang="bn" className={styles.footerSignOff}>
                {signOff}
              </p>
            ) : null}
            <p className={styles.footerText}>
              {site.name} · {text.town}
            </p>
          </div>
        </div>

        <div className={styles.footerCol}>
          {/* Not one hall: the evenings move around, so this names the next one's rather than a
              fixed address that is wrong half the year. */}
          <p className={styles.footerHead}>Where we meet</p>
          {next ? (
            <>
              <p>{next.venue}</p>
              <p className={styles.footerText}>
                {next.title}, {formatDayLongMonth(next.startsAt)}
              </p>
            </>
          ) : (
            <p className={styles.footerText}>Halls around {text.town}. Each evening’s page says where.</p>
          )}
          <Link to="/events" className={styles.footerLink}>
            What’s on
          </Link>
        </div>

        <div className={styles.footerCol}>
          <p className={styles.footerHead}>Talk to us</p>
          <ul className={styles.footerLinks}>
            {email ? (
              <li>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            ) : null}
            {footerNav(settings).map((item) => (
              <li key={item.label}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {social.length > 0 ? (
          <div className={styles.footerCol}>
            <p className={styles.footerHead}>Follow</p>
            <ul className={styles.social}>
              {social.map((channel) => (
                <li key={channel.name}>
                  <a href={channel.href} aria-label={channel.name} target="_blank" rel="noreferrer">
                    <Icon name={channel.icon} size={22} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>
    </footer>
  )
}
