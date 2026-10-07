import { useOnline } from '@/lib/useOnline'
import styles from './OfflineNotice.module.css'

/**
 * Said once, at the top, when the device has lost its connection.
 *
 * Without it every screen fails on its own terms — "We could not load the events", a Save that
 * will not save — and somebody on a train reads that as the site being broken. With it, they
 * know it is their signal and that it will come right when that does.
 */
export function OfflineNotice() {
  const online = useOnline()
  if (online) return null
  return (
    <p className={styles.notice} role="status">
      <span aria-hidden="true">📡</span>
      <span>
        <strong>You are offline.</strong> Nothing new will load or save until your connection is back —
        this page will carry on once it is.
      </span>
    </p>
  )
}
