import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import type { Event } from '@/domain/event'
import {
  peopleAt,
  validateAttendance,
  type AttendanceDraft,
  type AttendanceErrors,
  type EventAttendance,
} from '@/domain/attendance'
import styles from './ContentForms.module.css'

/**
 * Recording how many came, after the night.
 *
 * Three numbers, typed in. Registration is the committee's Google Form and the replies stay in
 * their sheet — this is the only thing that crosses over, and it brings nobody with it: no
 * household is named, nothing has to be matched to anybody, and there is nothing in it a member
 * could ever ask us to delete.
 */
export function AttendanceForm({
  events,
  existing,
  onSave,
  saving,
  error,
}: {
  events: Event[]
  existing: EventAttendance[]
  onSave: (draft: AttendanceDraft) => void
  saving?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<AttendanceDraft>(() => ({
    eventId: events[0]?.id ?? '',
    heldOn: events[0]?.startsAt.slice(0, 10) ?? '',
    households: 0,
    adults: 0,
    children: 0,
  }))
  const [errors, setErrors] = useState<AttendanceErrors>({})
  const [saved, setSaved] = useState(false)

  const already = existing.find((a) => a.eventId === draft.eventId)

  const number = (field: 'households' | 'adults' | 'children', label: string) => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={field}>
        {label}
      </label>
      <input
        id={field}
        className={styles.input}
        type="number"
        min={0}
        inputMode="numeric"
        value={String(draft[field])}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? `${field}-error` : undefined}
        onChange={(e) => setDraft({ ...draft, [field]: e.target.value === '' ? 0 : Number(e.target.value) })}
      />
      {errors[field] ? (
        <p id={`${field}-error`} className={styles.error}>
          {errors[field]}
        </p>
      ) : null}
    </div>
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateAttendance(draft)
    setErrors(found)
    setSaved(false)
    if (Object.keys(found).length === 0) {
      onSave(draft)
      setSaved(true)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="eventId">
            Which event
          </label>
          <select
            id="eventId"
            className={styles.input}
            value={draft.eventId}
            onChange={(e) => {
              const chosen = events.find((x) => x.id === e.target.value)
              setDraft({ ...draft, eventId: e.target.value, heldOn: chosen?.startsAt.slice(0, 10) ?? draft.heldOn })
              setSaved(false)
            }}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="heldOn">
            Held on
          </label>
          <input
            id="heldOn"
            className={styles.input}
            type="date"
            value={draft.heldOn}
            onChange={(e) => setDraft({ ...draft, heldOn: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.row}>
        {number('households', 'Households')}
        {number('adults', 'Adults')}
        {number('children', 'Children')}
      </div>

      <p className={styles.hint}>
        {peopleAt(draft)} {peopleAt(draft) === 1 ? 'person' : 'people'} in all.
        {already
          ? ` There is already a count for this event — ${already.households} households, ${peopleAt(already)} people. Saving replaces it.`
          : ' Nobody is named: this is the number, and nothing about who.'}
      </p>

      <div className={styles.actions}>
        <Button variant="gold" type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : already ? 'Correct the count' : 'Record it'}
        </Button>
        {saved && !saving && !error ? (
          <span className={styles.hint} role="status">
            Saved.
          </span>
        ) : null}
        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  )
}
