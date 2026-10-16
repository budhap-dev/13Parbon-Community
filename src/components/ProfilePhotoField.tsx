import { useId, useRef, useState } from 'react'
import { Button } from './Button'
import { ConfirmButton } from './ConfirmButton'
import { PersonPhoto } from './PersonPhoto'
import { PhotoCropper } from './PhotoCropper'
import type { PersonInput } from '@/domain/household'
import { prepareAvatar, type Crop, type Prepared } from '@/lib/images/prepare'
import type { SendPhoto } from './photoSender'
import styles from './ProfilePhotoField.module.css'

type Step = { at: 'idle' } | { at: 'working'; what: string } | { at: 'failed'; why: string }

/**
 * A grown-up's own photograph, on their household's form: add one, change it, or take it off.
 *
 * The file is made ready in the browser — cropped square, made small, and redrawn so that
 * nothing the phone wrote into it leaves the machine — then sent, and only the address of what
 * arrived is kept on the form. Nothing is on anybody's page until the household is saved; the
 * old photograph is taken out of the bucket once it has been.
 *
 * Not offered where there is nowhere to send it, rather than offered and failing.
 */
export function ProfilePhotoField({
  person,
  send,
  prepare = (file, crop) => prepareAvatar(file, undefined, crop),
  onChange,
}: {
  person: PersonInput
  send: SendPhoto | null
  prepare?: (file: File, crop?: Crop) => Promise<Prepared>
  onChange: (photo: string | undefined) => void
}) {
  const [step, setStep] = useState<Step>({ at: 'idle' })
  // The file being placed in its circle, and its address in this browser while it is.
  const [placing, setPlacing] = useState<{ file: File; src: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const ids = useId()
  if (!send || person.ageGroup !== 'adult') return null

  const who = person.name.trim() || 'this person'
  const done = () => {
    if (placing) URL.revokeObjectURL(placing.src)
    setPlacing(null)
    if (input.current) input.current.value = ''
  }
  const choose = (file: File | undefined) => {
    if (!file) return
    setStep({ at: 'idle' })
    setPlacing({ file, src: URL.createObjectURL(file) })
  }
  const use = async (file: File, crop: Crop) => {
    done()
    try {
      setStep({ at: 'working', what: 'Getting the photograph ready…' })
      const prepared = await prepare(file, crop)
      setStep({ at: 'working', what: 'Uploading…' })
      onChange(await send(prepared))
      setStep({ at: 'idle' })
    } catch (error) {
      setStep({ at: 'failed', why: error instanceof Error ? error.message : 'That photograph could not be added.' })
    }
  }

  return (
    <div className={styles.field}>
      <PersonPhoto person={person} size={56} />
      <div className={styles.words}>
        <div className={styles.actions}>
          <input
            ref={input}
            id={`${ids}-file`}
            className={styles.file}
            type="file"
            accept="image/jpeg,image/png"
            aria-label={`${person.photo ? 'Change the photograph of' : 'Add a photograph of'} ${who}`}
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <Button variant="line" size="sm" disabled={step.at === 'working'} onClick={() => input.current?.click()}>
            {person.photo ? 'Change photo' : 'Add a photo'}
          </Button>
          {person.photo ? (
            <ConfirmButton
              size="sm"
              aria-label={`Remove the photograph of ${who}`}
              title={`Take off the photograph of ${who}?`}
              body="It goes from the form now, and from the website — the file as well — when you save. Leave without saving and it stays."
              onConfirm={() => onChange(undefined)}
            >
              Remove photo
            </ConfirmButton>
          ) : null}
        </div>
        {step.at === 'working' ? (
          <p className={styles.note} role="status">
            {step.what}
          </p>
        ) : step.at === 'failed' ? (
          <p className={styles.error} role="alert">
            {step.why}
          </p>
        ) : (
          <p className={styles.note}>
            Optional. A clear photo of their face. Seen by your household and the committee, and beside their name on
            the public About page if it is there — on the committee or the members’ roll.
          </p>
        )}
      </div>
      {placing ? (
        <PhotoCropper src={placing.src} who={who} onCancel={done} onUse={(crop) => void use(placing.file, crop)} />
      ) : null}
    </div>
  )
}
