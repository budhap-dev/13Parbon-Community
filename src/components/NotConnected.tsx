import { useSettings } from '@/app/SettingsContext'
import { Icon } from './Icon'
import styles from './NotConnected.module.css'

/**
 * Stands in for the contact form while submissions have nowhere to go.
 *
 * It used to open by apologising for what the site could not do. Nobody arriving here wants
 * the state of our plumbing — they want a way to reach the committee, and there are two good
 * ones. So it gives them those and says nothing about the form.
 */
export function NotConnected() {
  const { text } = useSettings()
  return (
    <section className={styles.box} aria-labelledby="not-connected-title">
      <Icon name="megaphone" className={styles.icon} />
      <div className={styles.body}>
        <h2 id="not-connected-title" className={styles.title}>
          Talk to us
        </h2>
        <p className={styles.text}>
          Email the committee at <a href={`mailto:${text.email}`}>{text.email}</a>, or say hello in our WhatsApp
          group. Someone will come back to you.
        </p>
      </div>
    </section>
  )
}
