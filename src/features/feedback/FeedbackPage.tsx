import { useId, useState, type FormEvent } from 'react'
import { useSettings } from '@/app/SettingsContext'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { LoadFailed } from '@/components/LoadFailed'
import { SectionHeading } from '@/components/SectionHeading'
import { formatLongDate } from '@/domain/dates'
import { FEEDBACK_MAX, attributionOf, nameForSignature, validateFeedback, type FeedbackErrors } from '@/domain/feedback'
import { useApi, useApprovedFeedback, useSendFeedback } from '@/lib/api'
import { GoogleMark } from '@/lib/auth/GoogleMark'
import { usePublicSignIn } from '@/lib/auth/publicSignIn'
import styles from './Feedback.module.css'

/**
 * What the public says about us: a box to say it in, and what the committee has approved.
 *
 * The two halves are one page on purpose. A form on its own is a suggestion box — it asks for
 * something and shows nothing back, and people stop filling those in. Seeing that real words
 * from real evenings were read and put up is most of the reason anybody writes.
 *
 * Nothing sent here appears until the committee approves it, and the page says so before the
 * box rather than after: somebody typing a complaint about the heating should know it is
 * going to a person, not straight onto the website.
 */
export function FeedbackPage() {
  useDocumentTitle('Feedback')
  const id = useId()
  const { text } = useSettings()
  const { delivers } = useApi()
  const { data: approved, isPending, isError, refetch } = useApprovedFeedback()
  const send = useSendFeedback()
  const google = usePublicSignIn()

  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FeedbackErrors>({})
  /**
   * Whether to put their name to it. On by default once signed in, because somebody who has
   * just gone through Google did it for this — but a tick they can take off again, so
   * changing their mind does not mean signing out and losing what they have written.
   */
  const [withName, setWithName] = useState(true)

  const identity = google.state.status === 'signedIn' ? google.state.identity : null
  const signature = nameForSignature(identity?.name)
  const signed = Boolean(identity) && withName

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateFeedback({ message, signed })
    setErrors(found)
    if (Object.keys(found).length > 0) return
    send.mutate({ message, signed })
  }

  const left = FEEDBACK_MAX - message.trim().length
  const errorId = `${id}-error`
  const pieces = approved ?? []

  return (
    <Container className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>What people say</h1>
        <p className={styles.intro}>
          Tell us how we are doing. An evening that worked, one that did not, or something we could
          do better next time — the committee reads all of it.
        </p>
      </header>

      {delivers ? (
        <section className={styles.main} aria-labelledby="form-title">
          <h2 id="form-title" className={styles.formTitle}>
            Leave us a note
          </h2>

          {send.isSuccess ? (
            <section className={styles.sent} aria-live="polite">
              <h2 className={styles.sentTitle}>Thank you.</h2>
              <p className={styles.sentText}>
                {send.data.signed
                  ? `The committee has it, signed ${signature ?? 'in your name'}.`
                  : 'The committee has it, and it is anonymous.'}{' '}
                Someone will read it before anything goes on this page — so it may be a few days
                before you see it here, and they may decide not to put it up at all.
              </p>
              <div>
                <Button
                  variant="line"
                  size="sm"
                  onClick={() => {
                    send.reset()
                    setMessage('')
                  }}
                >
                  Say something else
                </Button>
              </div>
            </section>
          ) : (
            <form className={styles.form} onSubmit={onSubmit} noValidate aria-label="Feedback form">
              <div className={styles.field}>
                <label htmlFor={`${id}-message`} className={styles.label}>
                  What would you like to tell us?
                </label>
                <textarea
                  id={`${id}-message`}
                  name="message"
                  className={styles.textarea}
                  value={message}
                  maxLength={FEEDBACK_MAX}
                  onChange={(event) => {
                    setMessage(event.target.value)
                    if (errors.message) setErrors({})
                  }}
                  aria-invalid={errors.message ? true : undefined}
                  aria-describedby={errors.message ? errorId : undefined}
                />
                {/* Only near the end: a counter running from the first keystroke reads as a
                    word limit on something we have asked somebody to write freely. */}
                {left <= 200 ? (
                  <p className={`${styles.count} ${left <= 20 ? styles.countLow : ''}`}>
                    {left} {left === 1 ? 'character' : 'characters'} left
                  </p>
                ) : null}
                {errors.message ? (
                  <p id={errorId} className={styles.error}>
                    {errors.message}
                  </p>
                ) : null}
              </div>

              <div className={styles.who}>
                {identity ? (
                  <>
                    <div className={styles.whoRow}>
                      <GoogleMark size={18} />
                      <span className={styles.whoName}>Signed in as {identity.name}</span>
                      <Button variant="line" size="sm" onClick={google.signOut}>
                        Not you?
                      </Button>
                    </div>
                    <label className={styles.choice}>
                      <input
                        type="checkbox"
                        checked={withName}
                        onChange={(event) => setWithName(event.target.checked)}
                      />
                      {/* The exact name, in the label. Somebody agreeing to "put my name to
                          it" should be reading the words that will appear on the page, not
                          working out what their Google account is called. */}
                      <span>
                        Put my name to it{signature ? ` — “${signature}”` : ''}. Leave this unticked
                        and it goes anonymously.
                      </span>
                    </label>
                    <p className={styles.whoNote}>
                      Your name is shown as it appears above, and only if the committee puts your note
                      up. We never keep or show your email address.
                    </p>
                  </>
                ) : (
                  <>
                    <p className={styles.whoNote}>
                      You can send this anonymously — no account, nothing kept. Or sign in with Google
                      and your name goes with it, so people can see which real person said it.
                    </p>
                    <div className={styles.whoRow}>
                      <button
                        type="button"
                        className={styles.google}
                        onClick={google.signIn}
                        disabled={google.state.status !== 'ready'}
                      >
                        <GoogleMark />
                        {google.state.status === 'working' ? 'Taking you to Google…' : 'Sign in with Google'}
                      </button>
                    </div>
                    {google.state.status === 'off' ? (
                      <p className={styles.whoNote}>
                        Signing in is not switched on in this build, so notes sent from here are anonymous.
                      </p>
                    ) : null}
                    {google.state.status === 'failed' ? (
                      <p role="alert" className={styles.error}>
                        Google sign-in did not go through: {google.state.message}. You can still send this
                        anonymously.
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <div className={styles.actions}>
                <Button type="submit" disabled={send.isPending}>
                  {send.isPending ? 'Sending…' : signed ? 'Send, with my name' : 'Send anonymously'}
                </Button>
                {send.isError ? (
                  <p className={styles.error} role="alert">
                    {send.error instanceof Error ? send.error.message : 'Something went wrong. Please try again.'}
                  </p>
                ) : (
                  <p className={styles.hint}>
                    The committee reads everything before any of it appears on this page.
                  </p>
                )}
              </div>
            </form>
          )}
        </section>
      ) : (
        /*
         * The same answer the contact page gives when nothing is wired up: say so, and point at
         * the address that does work. A form that silently goes nowhere is worse than no form.
         */
        <p className={styles.note}>
          <strong>The form here is not switched on yet.</strong> Until it is, email the committee at{' '}
          <a href={`mailto:${text.email}`}>{text.email}</a> and we will read it just the same.
        </p>
      )}

      <section className={styles.wall} aria-labelledby="wall-title">
        <SectionHeading id="wall-title" title="What people have told us" />
        {isPending ? (
          <p className={styles.empty} aria-busy="true">
            Loading…
          </p>
        ) : isError ? (
          <LoadFailed what="what people have told us" onRetry={() => void refetch()} />
        ) : pieces.length === 0 ? (
          <p className={styles.empty}>
            Nothing up here yet. Yours could be the first — the committee puts these up as they come in.
          </p>
        ) : (
          <ul className={styles.pieces}>
            {pieces.map((piece) => (
              <li key={piece.id} className={styles.piece}>
                <blockquote className={styles.quote}>{piece.message}</blockquote>
                <p className={styles.by}>
                  <span className={styles.byName}>{attributionOf(piece)}</span>
                  <span>{formatLongDate(piece.createdAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  )
}
