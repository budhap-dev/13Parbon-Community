import type { ReactNode } from 'react'
import styles from './ActionBar.module.css'

/**
 * A form's or a list's own buttons — Save, Add, Cancel — at its top right, held in view.
 *
 * They were at the bottom, which on a long form is a scroll away from wherever somebody
 * stopped typing, and on a list grows further away with every row added. Up here they are
 * where the eye starts, and sticky, so the form can be as long as it needs to be and Save is
 * still one press away: it holds just under the portal's own bar while the rest scrolls.
 *
 * `status` is what the last press did — "Saved", or why not — beside the buttons it is about.
 */
export function ActionBar({ children, status, sticky = true }: { children: ReactNode; status?: ReactNode; sticky?: boolean }) {
  return (
    <div className={sticky ? styles.barSticky : styles.bar}>
      {status ? <div className={styles.status}>{status}</div> : null}
      <div className={styles.actions}>{children}</div>
    </div>
  )
}
