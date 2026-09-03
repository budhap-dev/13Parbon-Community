import { Link } from 'react-router'
import styles from './SectionHeading.module.css'

type Props = {
  title: string
  /** Small uppercase label instead of a big heading. */
  eyebrow?: boolean
  action?: { label: string; to: string }
  id?: string
}

export function SectionHeading({ title, eyebrow = false, action, id }: Props) {
  return (
    <div className={styles.row}>
      <h2 id={id} className={eyebrow ? styles.eyebrow : styles.title}>
        {title}
      </h2>
      {action ? (
        <Link to={action.to} className={styles.action}>
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
