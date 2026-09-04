import { Button } from './Button'
import styles from './LoadFailed.module.css'

type Props = {
  /** What could not be fetched, as it would read in a sentence: "the events". */
  what: string
  /** Ask for it again. Usually the query's own refetch. */
  onRetry?: () => void
}

/**
 * What a page shows when its data does not arrive. The alternative, and what these pages did
 * before, is a loading state that never ends: the viewer is left waiting on something that is
 * never coming, with nothing to press and no idea anything is wrong.
 */
export function LoadFailed({ what, onRetry }: Props) {
  return (
    <div role="alert" className={styles.box}>
      <p className={styles.text}>We could not load {what} just now.</p>
      {onRetry ? (
        <Button onClick={onRetry} variant="line" size="sm">
          Try again
        </Button>
      ) : null}
    </div>
  )
}
