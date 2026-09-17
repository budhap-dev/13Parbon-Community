import { useEffect, useId, useRef, useState } from 'react'
import { Button } from './Button'
import { CoverImage } from './CoverImage'
import { ACCEPTED, ACCEPTED_LABEL } from '@/domain/images'
import { prepareImage, type Prepared } from '@/lib/images/prepare'
import styles from './PhotoUpload.module.css'

/**
 * One photograph on its way in.
 *
 * A whole evening arrives at once — twenty pictures off a phone — so each carries its own state
 * rather than the component having a single one. Otherwise the tenth failing would have to
 * throw away the nine that were fine.
 */
type Item = {
  id: string
  name: string
  step: 'preparing' | 'ready' | 'sending' | 'failed'
  prepared?: Prepared
  preview?: string
  why?: string
}

const sizeOf = (blob: Blob) => `${Math.round(blob.size / 1024)}KB`

let counter = 0
const nextId = () => `photo-${++counter}`

/**
 * Choosing photographs, getting them ready, and sending them.
 *
 * The preparing happens here, in the browser, before anything is sent: the picture is
 * re-encoded from a pixel buffer, so the location, camera and date a phone writes into a
 * photograph never leave the machine it is on. What is sent has none of it to strip.
 *
 * Whether it can be sent at all depends on the bucket being configured. Where it is not, this
 * says so and says what to do instead, rather than offering a button that fails — the same way
 * the contact form offers an email address when there is nowhere for a message to go.
 *
 * `multiple` is off by default because the other caller is the event cover, where one
 * photograph is not a limitation but the correct number.
 */
export function PhotoUpload({
  canSend,
  onSend,
  onDone,
  onPreview,
  label = 'Choose a photograph',
  multiple = false,
}: {
  canSend: boolean
  /**
   * Sends both sizes and hands back where they ended up.
   *
   * `index` is the photograph's place in the batch being sent, because a caller numbering keys
   * from how many the album already has would give the same number to all of them: the album
   * has not grown yet when the second one is signed.
   */
  onSend: (prepared: Prepared, name: string, index: number) => Promise<{ url: string }>
  onDone: (url: string) => void
  /**
   * The photograph as it can be seen here, before it is anywhere a page could link to.
   *
   * A caller drawing a preview has nothing to draw between choosing a file and the bucket
   * answering, and a picture-shaped hole next to a picture that says it is ready reads as a
   * failure. What is handed over is an object URL: good on this machine only, so a caller
   * showing it says as much beside it. Null when there is nothing chosen.
   *
   * Only for the single-photograph caller — an album of twenty has no one preview.
   */
  onPreview?: (url: string | null) => void
  label?: string
  multiple?: boolean
}) {
  const [items, setItems] = useState<Item[]>([])
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const dropId = useId()

  const update = (id: string, change: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)))

  const choose = async (files: File[]) => {
    if (files.length === 0) return
    const taken = multiple ? files : files.slice(0, 1)
    const fresh: Item[] = taken.map((file) => ({ id: nextId(), name: file.name, step: 'preparing' }))
    // One at a time replaces what is there; a batch adds to it, so two drops make one album.
    setItems((current) => (multiple ? [...current, ...fresh] : fresh))

    /*
     * Prepared one after another rather than all at once. Each one decodes a full-size
     * photograph into a pixel buffer, and a dozen 12-megapixel pictures held open together is
     * how a phone browser runs out of memory and takes the page with it.
     */
    for (const [i, file] of taken.entries()) {
      const { id } = fresh[i]
      try {
        const prepared = await prepareImage(file)
        update(id, { step: 'ready', prepared, preview: URL.createObjectURL(prepared.thumb) })
      } catch (error) {
        update(id, { step: 'failed', why: error instanceof Error ? error.message : 'That picture could not be read.' })
      }
    }
  }

  const forget = (item: Item) => {
    if (item.preview) URL.revokeObjectURL(item.preview)
    setItems((current) => current.filter((other) => other.id !== item.id))
  }

  const send = async () => {
    const ready = items.filter((item) => item.step === 'ready')
    /*
     * In order, and one at a time. The bucket would take them together, but the album would
     * not: each needs its own place in the order, and the screen showing the first arrive
     * while the fifth is still going is a better answer than a long silence.
     */
    for (const [index, item] of ready.entries()) {
      update(item.id, { step: 'sending' })
      try {
        const { url } = await onSend(item.prepared as Prepared, item.name, index)
        onDone(url)
        forget(item)
      } catch (error) {
        /*
         * Named, because this one is in a crowd. A refusal from the preparing already carries
         * the filename; one from the bucket does not, and "that photograph would not upload"
         * with nine others on the screen does not say which to try again.
         */
        const why = error instanceof Error ? error.message : 'It would not upload.'
        update(item.id, { step: 'failed', why: `${item.name}: ${why}` })
      }
    }
  }

  /*
   * Derived rather than announced from each place an item changes. Prepared, failed, removed,
   * sent — every one of those moves the answer, and the one that gets forgotten is the one that
   * leaves a preview pointing at an object URL that has been revoked.
   */
  const chosen = multiple ? null : (items.find((item) => item.preview)?.preview ?? null)
  useEffect(() => {
    onPreview?.(chosen)
  }, [chosen, onPreview])

  const readyCount = items.filter((item) => item.step === 'ready').length
  const busy = items.some((item) => item.step === 'preparing' || item.step === 'sending')

  return (
    <div
      className={`${styles.upload} ${dragging ? styles.dragging : ''}`}
      onDragOver={(e) => {
        // Without this the browser navigates to the file, which loses whatever was on the page.
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void choose(Array.from(e.dataTransfer.files))
      }}
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple={multiple}
        className={styles.file}
        onChange={(e) => {
          void choose(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />

      {items.map((item) =>
        item.step === 'failed' ? (
          <p key={item.id} className={styles.error} role="alert">
            {item.why}
          </p>
        ) : item.step === 'preparing' ? (
          <p key={item.id} className={styles.note} role="status">
            {item.name}: getting it ready…
          </p>
        ) : (
          <div key={item.id} className={styles.ready}>
            <CoverImage src={item.preview ?? ''} ratio="4 / 3" className={styles.thumb} />
            <div className={styles.readyBody}>
              <p className={styles.name}>{item.name}</p>
              <p className={styles.note}>
                {item.step === 'sending' ? (
                  'Sending…'
                ) : (
                  <>
                    Ready: {item.prepared?.width}×{item.prepared?.height}, {sizeOf(item.prepared?.full as Blob)} and{' '}
                    {sizeOf(item.prepared?.thumb as Blob)} for the grid.{' '}
                    <strong>No location, camera or date</strong> — the picture was re-made here, so there was none to
                    carry.
                  </>
                )}
              </p>
              {item.step === 'ready' ? (
                <div className={styles.actions}>
                  <Button variant="line" size="sm" onClick={() => forget(item)}>
                    Take it off the list
                  </Button>
                  {/*
                    * Said here, beside the picture, rather than at the foot of the component.
                    * On the event designer the choose-a-file row sits under this one, so a
                    * notice below that was off the bottom of what somebody was looking at —
                    * and what they saw was a picture that had prepared itself and then done
                    * nothing, with no button and no reason given.
                    */}
                  {!canSend ? (
                    <span className={styles.note} role="status">
                      Nowhere to put it: this build has no bucket configured, so it cannot be
                      saved and nothing will use it yet.
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ),
      )}

      <div className={styles.actions}>
        <Button variant="line" size="sm" disabled={busy} aria-describedby={dropId} onClick={() => input.current?.click()}>
          {busy ? 'Working…' : label}
        </Button>
        <span className={styles.note} id={dropId}>
          {ACCEPTED_LABEL}
          {multiple ? ' · or drop them here' : ''}
        </span>
        {canSend && readyCount > 0 ? (
          <Button variant="gold" size="sm" disabled={busy} onClick={() => void send()}>
            {readyCount === 1 ? 'Put it in the bucket' : `Put all ${readyCount} in the bucket`}
          </Button>
        ) : null}
      </div>

    </div>
  )
}
