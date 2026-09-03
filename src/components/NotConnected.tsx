import { isPlaceholder, site } from '@/app/site'
import { Icon } from './Icon'
import styles from './NotConnected.module.css'

type Props = {
  /** Where to write instead. Hidden when it is still a placeholder. */
  email: string
  /** What the visitor was trying to do, e.g. "send a message". */
  action: string
}

/**
 * Shown in place of the contact form while submissions have nowhere to go. Better an
 * honest detour than a form that thanks people for a message nobody receives.
 */
export function NotConnected({ action, email }: Props) {
  const emailKnown = !isPlaceholder(email)
  return (
    <section className={styles.box} aria-labelledby="not-connected-title">
      <Icon name="megaphone" className={styles.icon} />
      <div className={styles.body}>
        <h2 id="not-connected-title" className={styles.title}>
          Not quite ready to {action} here
        </h2>
        <p className={styles.text}>
          We are still setting this up, and we would rather tell you than take your details and lose them.
        </p>
        <p className={styles.text}>
          {emailKnown ? 'In the meantime, write to us at ' : 'In the meantime, please reach us on '}
          {emailKnown ? (
            <a href={`mailto:${email}`}>{email}</a>
          ) : (
            site.social.map((channel, i) => (
              <span key={channel.name}>
                {i > 0 ? ' or ' : ''}
                <a href={channel.href}>{channel.name}</a>
              </span>
            ))
          )}
          .
        </p>
      </div>
    </section>
  )
}
