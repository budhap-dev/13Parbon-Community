import { useRef, useState } from 'react'
import { Button } from './Button'
import { CoverImage } from './CoverImage'
import { ACCEPTED, ACCEPTED_LABEL } from '@/domain/images'
import { prepareImage, type Prepared } from '@/lib/images/prepare'
import styles from './PhotoUpload.module.css'

type State =
  | { step: 'idle' }
  | { step: 'preparing' }
  | { step: 'ready'; prepared: Prepared; preview: string; name: string }
  | { step: 'sending' }
  | { step: 'failed'; why: string }

const sizeOf = (blob: Blob) => `${Math.round(blob.size / 1024)}KB`

/**
 * Choosing a photograph, getting it ready, and sending it.
 *
 * The preparing happens here, in the browser, before anything is sent: the picture is
 * re-encoded from a pixel buffer, so the location, camera and date a phone writes into a
 * photograph never leave the machine it is on. What is sent has none of it to strip.
 *
 * Whether it can be sent at all depends on the bucket being configured. Where it is not, this
 * says so and says what to do instead, rather than offering a button that fails — the same way
 * the contact form offers an email address when there is nowhere for a message to go.
 */
export function PhotoUpload({
  canSend,
  onSend,
  onDone,
  label = 'Choose a photograph',
}: {
  canSend: boolean
  /** Sends both sizes and hands back where they ended up. */
  onSend: (prepared: Prepared, name: string) => Promise<{ url: string }>
  onDone: (url: string) => void
  label?: string
}) {
  const [state, setState] = useState<State>({ step: 'idle' })
  const input = useRef<HTMLInputElement>(null)

  const choose = async (file: File) => {
    setState({ step: 'preparing' })
    try {
      const prepared = await prepareImage(file)
      setState({ step: 'ready', prepared, preview: URL.createObjectURL(prepared.thumb), name: file.name })
    } catch (error) {
      setState({ step: 'failed', why: error instanceof Error ? error.message : 'That picture could not be read.' })
    }
  }

  const send = async () => {
    if (state.step !== 'ready') return
    const { prepared, name } = state
    setState({ step: 'sending' })
    try {
      const { url } = await onSend(prepared, name)
      onDone(url)
      setState({ step: 'idle' })
    } catch (error) {
      setState({ step: 'failed', why: error instanceof Error ? error.message : 'It would not upload.' })
    }
  }

  return (
    <div className={styles.upload}>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(',')}
        className={styles.file}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void choose(file)
          e.target.value = ''
        }}
      />

      {state.step === 'ready' ? (
        <div className={styles.ready}>
          <CoverImage src={state.preview} ratio="4 / 3" className={styles.thumb} />
          <div className={styles.readyBody}>
            <p className={styles.name}>{state.name}</p>
            <p className={styles.note}>
              Ready: {state.prepared.width}×{state.prepared.height}, {sizeOf(state.prepared.full)} and{' '}
              {sizeOf(state.prepared.thumb)} for the grid. <strong>No location, camera or date</strong> — the
              picture was re-made here, so there was none to carry.
            </p>
            <div className={styles.actions}>
              {canSend ? (
                <Button variant="gold" size="sm" onClick={() => void send()}>
                  Put it in the bucket
                </Button>
              ) : null}
              <Button variant="line" size="sm" onClick={() => setState({ step: 'idle' })}>
                Choose another
              </Button>
            </div>
            {!canSend ? (
              <p className={styles.note} role="status">
                There is nowhere to put it yet: this build has no bucket configured. Everything above
                is real — prepare the rest with <code>scripts/prepare-photos.mjs</code> and upload by
                hand for now.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button
            variant="line"
            size="sm"
            disabled={state.step === 'preparing' || state.step === 'sending'}
            onClick={() => input.current?.click()}
          >
            {state.step === 'preparing' ? 'Getting it ready…' : state.step === 'sending' ? 'Sending…' : label}
          </Button>
          <span className={styles.note}>{ACCEPTED_LABEL}</span>
        </div>
      )}

      {state.step === 'failed' ? (
        <p className={styles.error} role="alert">
          {state.why}
        </p>
      ) : null}
    </div>
  )
}
