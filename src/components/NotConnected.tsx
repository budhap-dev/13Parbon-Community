import { isPlaceholder, site } from '@/app/site'
import { Icon } from './Icon'
import styles from './NotConnected.module.css'

type Props = {
  /** What the visitor was trying to do, e.g. "send a message". */
  action: string
}

/**
 * Shown in place of the contact form while submissions have nowhere to go. Better an
 * honest detour than a form that thanks people for a message nobody receives.
 */
export function NotConnected({ action }: Props) {
  const emailKnown = !isPlaceholder(site.email)
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
            <a href={`mailto:${site.email}`}>{site.email}</a>
          ) : (
            /* Every channel is named; only the ones with an address are linked. */
            site.social.map((channel, i) => (
              <span key={channel.name}>
                {i > 0 ? ' and ' : ''}
                {channel.href ? (
                  <a href={channel.href} target="_blank" rel="noreferrer">
                    {channel.mention}
                  </a>
                ) : (
                  channel.mention
                )}
              </span>
            ))
          )}
          .
        </p>
      </div>
    </section>
  )
}
