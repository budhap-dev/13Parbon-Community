import { formatDateWithYear } from '@/domain/dates'
import type { Household } from '@/domain/household'
import { hasPaid, paidOn, yearLabel } from '@/domain/payments'
import { useSetPaid } from '@/lib/api'
import styles from '@/features/portal/Portal.module.css'
import own from './PaidSwitch.module.css'

/**
 * Whether a household has paid for one membership year, and the switch that says so.
 *
 * It saves as soon as it is pressed, the way a switch does: there is no Save for a tick. Marking
 * somebody not paid again is the same press, and is not a removal of anything they own, so it
 * is not asked about twice.
 */
export function PaidSwitch({
  household,
  year,
  showDate = false,
}: {
  household: Household
  year: number
  /** The day it was ticked, beside the switch: on the household's own record, not in the list. */
  showDate?: boolean
}) {
  const setPaid = useSetPaid()
  // While a press is on its way, it reads as the answer it asked for.
  const paid = setPaid.isPending ? setPaid.variables.paid : hasPaid(household, year)
  const on = paidOn(household, year)

  return (
    <span className={own.wrap}>
      <button
        type="button"
        role="switch"
        aria-checked={paid}
        aria-label={`${household.name} paid for ${yearLabel(year)}`}
        className={own.button}
        disabled={setPaid.isPending}
        onClick={() => setPaid.mutate({ householdId: household.id, year, paid: !paid })}
      >
        <span className={paid ? styles.switchOn : styles.switch} aria-hidden="true">
          <span className={styles.knob} />
        </span>
        <span className={paid ? own.paid : own.unpaid}>{paid ? 'Paid' : 'Not paid'}</span>
      </button>
      {showDate && paid && on && !setPaid.isPending ? (
        <span className={`${styles.muted} ${styles.tiny}`}>ticked {formatDateWithYear(on)}</span>
      ) : null}
      {setPaid.isError ? (
        <span className={own.error} role="alert">
          That did not save. {setPaid.error.message}
        </span>
      ) : null}
    </span>
  )
}
