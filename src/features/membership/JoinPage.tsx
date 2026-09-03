import { useId, useState, type FormEvent } from 'react'
import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { validateApplication, type MembershipApplicationInput, type MembershipErrors } from '@/domain/membership'
import { useApplyForMembership } from '@/lib/api'
import styles from './Membership.module.css'

type Values = { [K in keyof MembershipApplicationInput]: string }

const empty: Values = { householdName: '', contactName: '', email: '', phone: '', adults: '2', children: '0', message: '' }

function toInput(values: Values): MembershipApplicationInput {
  return {
    ...values,
    adults: Number(values.adults),
    children: values.children.trim() === '' ? 0 : Number(values.children),
  }
}

export function JoinPage() {
  useDocumentTitle('Join the community')
  const id = useId()
  const [values, setValues] = useState<Values>(empty)
  const [errors, setErrors] = useState<MembershipErrors>({})
  const apply = useApplyForMembership()

  const update = (field: keyof Values) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const input = toInput(values)
    const found = validateApplication(input)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    apply.mutate(input)
  }

  const field = (
    name: keyof Values,
    label: string,
    extra?: { type?: string; multiline?: boolean; autoComplete?: string; optional?: boolean; min?: number },
  ) => {
    const inputId = `${id}-${name}`
    const errorId = `${inputId}-error`
    const error = errors[name]
    const shared = {
      id: inputId,
      name,
      value: values[name],
      onChange: update(name),
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? errorId : undefined,
      autoComplete: extra?.autoComplete,
    }
    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label} {extra?.optional ? <span className={styles.optional}>(optional)</span> : null}
        </label>
        {extra?.multiline ? (
          <textarea {...shared} className={styles.textarea} />
        ) : (
          <input {...shared} type={extra?.type ?? 'text'} min={extra?.min} className={styles.input} />
        )}
        {error ? (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <Container className={styles.page}>
      <div className={styles.main}>
        <h1 className={styles.title}>Join the community</h1>
        <p className={styles.intro}>
          Membership is per household, {site.membershipFee} a year. Apply below and the committee will be in touch about
          payment and your welcome.
        </p>

        {apply.isSuccess ? (
          <section className={styles.sent} aria-live="polite">
            <h2 className={styles.sentTitle}>Welcome, {apply.data.householdName.trim()}.</h2>
            <p className={styles.sentText}>
              Your application is with the committee. We will write to {apply.data.email} within a few days with the
              next step.
            </p>
            <div className={styles.cta}>
              <Button to="/events" variant="line" size="sm">
                See what’s on
              </Button>
            </div>
          </section>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate aria-label="Membership application">
            {field('householdName', 'Family or household name')}
            {field('contactName', 'Contact name', { autoComplete: 'name' })}
            <div className={styles.row}>
              {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
              {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel', optional: true })}
            </div>
            <div className={styles.row}>
              {field('adults', 'Adults', { type: 'number', min: 1 })}
              {field('children', 'Children', { type: 'number', min: 0 })}
            </div>
            {field('message', 'Anything else', { multiline: true, optional: true })}
            <div className={styles.actions}>
              <Button type="submit" disabled={apply.isPending}>
                {apply.isPending ? 'Sending…' : 'Apply to join'}
              </Button>
              {apply.isError ? (
                <p className={styles.error} role="alert">
                  {apply.error instanceof Error ? apply.error.message : 'Something went wrong. Please try again.'}
                </p>
              ) : (
                <p className={styles.hint}>We keep your details for membership only. See our privacy notice.</p>
              )}
            </div>
          </form>
        )}
      </div>

      <aside className={styles.side}>
        <section className={styles.block} aria-labelledby="why-title">
          <h2 id="why-title" className={styles.blockTitle}>
            What membership gives you
          </h2>
          <ul className={styles.list}>
            <li>A vote at the annual general meeting and a say in the programme.</li>
            <li>Member pricing at events where it applies.</li>
            <li>The member portal when it launches: directory, documents and your registrations.</li>
            <li>A place on stage for anyone in the household who wants one.</li>
          </ul>
        </section>
        <section className={styles.block} aria-labelledby="not-sure-title">
          <h2 id="not-sure-title" className={styles.blockTitle}>
            Not sure yet?
          </h2>
          <p className={styles.sentText}>Come to one event first. Membership is for when you already know you want to stay.</p>
          <div className={styles.cta}>
            <Button to="/events" variant="line" size="sm">
              What’s on
            </Button>
          </div>
        </section>
      </aside>
    </Container>
  )
}
