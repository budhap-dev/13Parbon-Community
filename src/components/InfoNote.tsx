import type { ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './InfoNote.module.css'

/**
 * An explanation kept one tap away: a line saying what it is about, which opens to the rest.
 *
 * For the notes that say how something works — what goes in the saved list, who can change a
 * role — which are worth having and not worth reading every visit. Left open on the page they
 * were a block of tinted text at the foot of every screen, read once and then scrolled past for
 * good; on a phone two of them were a screenful.
 *
 * Not for anything somebody must not miss: a warning that the feedback page is switched off,
 * or a photograph somebody has asked to be taken down, stays out on the page where it is.
 *
 * A native disclosure, so the keyboard, a screen reader and the browser's find-in-page (which
 * opens it to show a match) all work without anything here having to.
 */
export function InfoNote({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className={styles.info}>
      <summary className={styles.summary}>
        <Icon name="info" size={18} className={styles.icon} />
        <span className={styles.label}>{summary}</span>
        <span className={styles.chevron} aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}
