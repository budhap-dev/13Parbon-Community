import { useId, useState, type FormEvent } from 'react'
import { NotConnected } from '@/components/NotConnected'
import { Button } from '@/components/Button'
import {
  describeParty,
  emptyEventRegistration,
  validateEventRegistration,
  type EventRegistrationErrors,
  type EventRegistrationInput,
} from '@/domain/event-registration'
import { useApi, useRegisterForEvent, useSiteText } from '@/lib/api'
import styles from './Events.module.css'

type Props = {
  slug: string
  eventTitle: string
}

/**
 * Registering does not need an account. Most people at a programme are not members, and
 * asking them to sign in first would lose the headcount this exists to collect.
 */
export function RegisterForm({ slug, eventTitle }: Props) {
  const id = useId()
  const api = useApi()
  const text = useSiteText()
  const [values, setValues] = useState<EventRegistrationInput>(emptyEventRegistration)
  const [errors, setErrors] = useState<EventRegistrationErrors>({})
  const register = useRegisterForEvent(slug)

  if (!api.delivers) {
    return (
      <section className={styles.register} aria-labelledby="register-title">
        <h2 id="register-title" className={styles.registerTitle}>
          Coming along?
        </h2>
        <NotConnected action="register" email={text.email} />
      </section>
    )
  }

  if (register.isSuccess) {
    const saved = register.data
    return (
      <section className={styles.registerDone} aria-live="polite" aria-labelledby="register-title">
        <h2 id="register-title" className={styles.registerTitle}>
          See you there, {saved.householdName}.
        </h2>
        <p className={styles.registerText}>
          We have {describeParty(saved)} down for {eventTitle}. A confirmation is on its way to {saved.email}.
          {saved.helping ? ' Thank you for offering to help; someone will be in touch about it.' : ''}
        </p>
        <p className={styles.note}>
          Something changed? <a href="/contact">Tell the committee</a> and we will update the numbers.
        </p>
      </section>
    )
  }

  const update =
    (field: keyof EventRegistrationInput, asNumber = false) =>
    (event: { target: { value: string } }) => {
      const raw = event.target.value
      setValues((current) => ({ ...current, [field]: asNumber ? Number(raw) : raw }))
      if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
    }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateEventRegistration(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    register.mutate(values)
  }

  const field = (
    name: keyof EventRegistrationInput,
    label: string,
    extra?: { type?: string; multiline?: boolean; autoComplete?: string; optional?: boolean; min?: number; hint?: string },
  ) => {
    const inputId = `${id}-${name}`
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`
    const error = errors[name]
    const describedBy = [error ? errorId : null, extra?.hint ? hintId : null].filter(Boolean).join(' ')
    const shared = {
      id: inputId,
      name,
      value: String(values[name]),
      onChange: update(name, extra?.type === 'number'),
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
      autoComplete: extra?.autoComplete,
    }
    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label} {extra?.optional ? <span className={styles.optional}>(optional)</span> : null}
        </label>
        {extra?.multiline ? (
          <textarea {...shared} className={styles.textarea} rows={3} />
        ) : (
          <input {...shared} type={extra?.type ?? 'text'} min={extra?.min} inputMode={extra?.type === 'number' ? 'numeric' : undefined} className={styles.input} />
        )}
        {extra?.hint ? (
          <p id={hintId} className={styles.hint}>
            {extra.hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <section className={styles.register} aria-labelledby="register-title">
      <h2 id="register-title" className={styles.registerTitle}>
        Coming along?
      </h2>
      <p className={styles.registerText}>
        One registration per household. You do not need an account, and you do not have to be a member.
      </p>
      <form className={styles.registerForm} onSubmit={onSubmit} noValidate aria-label={`Register for ${eventTitle}`}>
        {field('householdName', 'Family or household name', { hint: 'However you would like to be called out on the night.' })}
        <div className={styles.registerRow}>
          {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel', optional: true })}
        </div>
        <div className={styles.registerRow}>
          {field('adults', 'Adults', { type: 'number', min: 1 })}
          {field('children', 'Children', { type: 'number', min: 0, hint: 'So we can plan the children’s programme.' })}
        </div>
        {field('helping', 'Could you lend a hand?', {
          optional: true,
          hint: 'Cooking, decorations, sound, clearing up. Anything at all.',
        })}
        {field('notes', 'Anything we should know?', {
          multiline: true,
          optional: true,
          hint: 'Dietary needs, access needs, or a note for the organisers.',
        })}
        <div className={styles.registerActions}>
          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? 'Sending…' : 'We’re coming'}
          </Button>
          {register.isError ? (
            <p className={styles.error} role="alert">
              {register.error instanceof Error ? register.error.message : 'Something went wrong. Please try again.'}
            </p>
          ) : (
            <p className={styles.hint}>We only use this to plan the day and to confirm.</p>
          )}
        </div>
      </form>
    </section>
  )
}
