import { Link } from 'react-router'
import { TAKEDOWN_PROMISE } from '@/domain/contact'
import styles from './Gallery.module.css'

/**
 * The privacy page says we take down any photograph somebody would rather we did not publish.
 * That promise is only worth something if the person who wants it kept is looking at the
 * photographs when they read it, so it is repeated here rather than left a page away.
 */
export function RemovalNotice() {
  return (
    <p className={styles.notice}>
      If you or your child are in a photograph here and would rather not be,{' '}
      <Link to="/contact?about=photo">tell us</Link> and we will take it down — {TAKEDOWN_PROMISE}.
    </p>
  )
}
