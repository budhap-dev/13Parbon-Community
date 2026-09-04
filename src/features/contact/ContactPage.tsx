import { useId, useState, type FormEvent } from 'react'
import { activeSocial, isPlaceholder, site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { NotConnected } from '@/components/NotConnected'
import { validateContact, type ContactErrors, type ContactInput } from '@/domain/contact'
import { useApi, useSendContact } from '@/lib/api'
import styles from './Contact.module.css'


/**
 * OpenStreetMap rather than a keyed service: no account to hold, and nothing that would
 * make the privacy notice untrue. The box is a small window around the pin.
 */
function mapEmbedUrl({ lat, lon }: { lat: number; lon: number }): string {
  const box = [lon - 0.005, lat - 0.0025, lon + 0.005, lat + 0.0025].map((n) => n.toFixed(5)).join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${lat},${lon}`
}

/** Hands the address to whichever maps app the visitor already uses. */
function directionsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

const empty: ContactInput = { name: '', email: '', subject: '', message: '' }

export function ContactPage() {
  useDocumentTitle('Contact us')
  const id = useId()
  const [values, setValues] = useState<ContactInput>(empty)
  const [errors, setErrors] = useState<ContactErrors>({})
  const send = useSendContact()
  const { delivers } = useApi()

  const update = (field: keyof ContactInput) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateContact(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    send.mutate(values)
  }

  const field = (name: keyof ContactInput, label: string, extra?: { type?: string; multiline?: boolean; autoComplete?: string }) => {
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
          {label}
        </label>
        {extra?.multiline ? (
          <textarea {...shared} className={styles.textarea} />
        ) : (
          <input {...shared} type={extra?.type ?? 'text'} className={styles.input} />
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
        <h1 className={styles.title}>Contact us</h1>
        <p className={styles.intro}>
          A question about an event, an idea for the programme, or you just want to say hello. The committee reads
          every message.
        </p>

        {!delivers ? (
          <NotConnected action="send a message" />
        ) : send.isSuccess ? (
          <section className={styles.sent} aria-live="polite">
            <h2 className={styles.sentTitle}>Thank you, {send.data.name.trim().split(' ')[0]}.</h2>
            <p className={styles.sentText}>
              Your message is with the committee. We will reply to {send.data.email} within a few days.
            </p>
            <div>
              <Button
                variant="line"
                size="sm"
                onClick={() => {
                  send.reset()
                  setValues(empty)
                }}
              >
                Send another
              </Button>
            </div>
          </section>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate aria-label="Contact form">
            {field('name', 'Your name', { autoComplete: 'name' })}
            {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {field('subject', 'Subject')}
            {field('message', 'Message', { multiline: true })}
            <div className={styles.actions}>
              <Button type="submit" disabled={send.isPending}>
                {send.isPending ? 'Sending…' : 'Send message'}
              </Button>
              {send.isError ? (
                <p className={styles.error} role="alert">
                  {send.error instanceof Error ? send.error.message : 'Something went wrong. Please try again.'}
                </p>
              ) : (
                <p className={styles.hint}>We only use your email to reply.</p>
              )}
            </div>
          </form>
        )}
      </div>

      <aside className={styles.side}>
        <section className={styles.block} aria-labelledby="find-title">
          <h2 id="find-title" className={styles.blockTitle}>
            Find us
          </h2>
          <address className={styles.address}>
            {site.venue}
            <br />
            {site.address}
            <br />
            {isPlaceholder(site.email) ? site.email : <a href={`mailto:${site.email}`}>{site.email}</a>}
          </address>
          {site.coordinates ? (
            <>
              <iframe
                className={styles.map}
                title={`Map showing ${site.venue}, ${site.address}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl(site.coordinates)}
              />
              <a className={styles.directions} href={directionsUrl(`${site.venue}, ${site.address}`)} target="_blank" rel="noreferrer">
                Get directions
                <Icon name="external" size={15} />
              </a>
            </>
          ) : (
            <p className={styles.mapNote}>A map appears here once the venue address is confirmed.</p>
          )}
        </section>
        <section className={styles.block} aria-labelledby="social-title">
          <h2 id="social-title" className={styles.blockTitle}>
            Follow along
          </h2>
          <ul className={styles.social}>
            {activeSocial().map((channel) => (
              <li key={channel.name}>
                <a href={channel.href} aria-label={channel.name} target="_blank" rel="noreferrer">
                  <Icon name={channel.icon} size={22} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </Container>
  )
}
