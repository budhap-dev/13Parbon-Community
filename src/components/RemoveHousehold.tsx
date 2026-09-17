import { useId, useState } from 'react'
import { Button } from './Button'
import { DownloadExport } from './DownloadExport'
import type { Household } from '@/domain/household'
import type { HouseholdExport } from '@/domain/subjectAccess'
import styles from './RemoveHousehold.module.css'

/**
 * Erasing a household.
 *
 * Three things shape this. It cannot be undone, it removes a real family's record, and the
 * committee decided the registrations go with it — so past events lose those headcounts and the
 * attendance history thins out behind you.
 *
 * Hence the copy offered in the same place rather than somewhere else: once this is done the
 * export is the only account of that household there will ever be, and "you should have taken
 * one first" is a poor thing to say afterwards. And hence typing the name — a confirm dialog is
 * something people click through, and this is not an action to lose to a misclick.
 */
export function RemoveHousehold({
  household,
  onRemove,
  removing,
  error,
  copy,
  gatheringCopy,
  onAskForCopy,
}: {
  household: Household
  onRemove: () => void
  removing?: boolean
  error?: string
  copy?: HouseholdExport
  gatheringCopy?: boolean
  onAskForCopy: () => void
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const id = useId()

  const matches = typed.trim() === household.name

  if (!open) {
    return (
      <div className={styles.zone}>
        <h3 className={styles.title}>Remove this household</h3>
        <p className={styles.text}>
          Erases {household.name} and everything we hold about them. This cannot be undone.
        </p>
        <div className={styles.actions}>
          <Button variant="line" size="sm" onClick={() => setOpen(true)}>
            Remove this household
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.zone}>
      <h3 className={styles.title}>Remove {household.name}?</h3>

      <p className={styles.text}>This cannot be undone. It removes:</p>
      <ul className={styles.list}>
        <li>the household record, and every person in it</li>
        <li>the account of what they did: the trail stays, but it no longer names them</li>
      </ul>
      <p className={styles.text}>
        They will not be able to sign in again unless the committee adds them back, which starts
        them from nothing.
      </p>

      <div className={styles.copyFirst}>
        <p className={styles.text}>
          <strong>Take a copy first.</strong> Afterwards this is the only record of them that will
          exist anywhere.
        </p>
        <DownloadExport data={copy} loading={gatheringCopy} onAsk={onAskForCopy} />
      </div>

      <div className={styles.confirm}>
        <label className={styles.label} htmlFor={id}>
          Type <strong>{household.name}</strong> to confirm
        </label>
        <input
          id={id}
          className={styles.input}
          value={typed}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
        />
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="line" size="sm" onClick={() => setOpen(false)}>
          Keep them
        </Button>
        <Button variant="danger" size="sm" disabled={!matches || removing} onClick={onRemove}>
          {removing ? 'Removing…' : 'Remove permanently'}
        </Button>
      </div>
    </div>
  )
}
