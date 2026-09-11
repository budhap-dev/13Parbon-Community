import { Link } from 'react-router'
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
      <Link to="/contact">tell us</Link> and we will take it down. You do not have to give a reason.
    </p>
  )
}
