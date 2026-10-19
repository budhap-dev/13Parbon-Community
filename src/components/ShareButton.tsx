import { Button } from './Button'
import { Icon } from './Icon'
import styles from './ShareButton.module.css'
import { useShare } from './useShare'

type Props = {
  /** Headline for the share sheet, usually the event's own title. */
  title: string
  /** A line of context, shown by some apps under the title. */
  text?: string
  size?: 'sm' | 'md'
}

/**
 * Passing an event on is how this community actually invites people: a link into the WhatsApp
 * group or the Facebook page. On a phone this opens the share sheet, so those are one tap
 * away. Where there is no share sheet — most desktop browsers — it copies the link instead,
 * which is the same job done the way a desktop does it.
 */
export function ShareButton({ title, text, size = 'md' }: Props) {
  const { share, result, message } = useShare()

  return (
    <span className={styles.wrap}>
      <Button onClick={() => share({ title, text })} variant="line" size={size}>
        <Icon name="share" size={18} className={styles.icon} />
        Share
      </Button>
      {/* Assertive, because it answers a press and is gone again in a moment. */}
      <span role="status" aria-live="polite" className={result === 'idle' ? styles.srOnly : styles.note}>
        {message}
      </span>
    </span>
  )
}
