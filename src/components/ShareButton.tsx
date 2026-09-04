import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import styles from './ShareButton.module.css'

type Props = {
  /** Headline for the share sheet, usually the event's own title. */
  title: string
  /** A line of context, shown by some apps under the title. */
  text?: string
  size?: 'sm' | 'md'
}

type Result = 'idle' | 'copied' | 'failed'

/**
 * Passing an event on is how this community actually invites people: a link into the WhatsApp
 * group or the Facebook page. On a phone this opens the share sheet, so those are one tap
 * away. Where there is no share sheet — most desktop browsers — it copies the link instead,
 * which is the same job done the way a desktop does it.
 */
export function ShareButton({ title, text, size = 'md' }: Props) {
  const [result, setResult] = useState<Result>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const announce = (next: Result) => {
    setResult(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setResult('idle'), 2600)
  }

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // Dismissing the sheet lands here as well as a real failure, so fall through to the
        // copy rather than telling the viewer something went wrong when they simply changed
        // their mind.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      announce('copied')
    } catch {
      announce('failed')
    }
  }

  return (
    <span className={styles.wrap}>
      <Button onClick={share} variant="line" size={size}>
        <Icon name="share" size={18} className={styles.icon} />
        Share
      </Button>
      {/* Assertive, because it answers a press and is gone again in a moment. */}
      <span role="status" aria-live="polite" className={result === 'idle' ? styles.srOnly : styles.note}>
        {result === 'copied' ? 'Link copied' : result === 'failed' ? 'Could not copy the link' : ''}
      </span>
    </span>
  )
}
