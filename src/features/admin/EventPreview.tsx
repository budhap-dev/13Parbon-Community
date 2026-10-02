import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/Icon'
import type { Event } from '@/domain/event'
import { PREVIEW_PATH, previewMessage, readPreviewMessage } from '@/features/events/previewChannel'
import { useReducedMotion } from '@/lib/useReducedMotion'
import styles from './EventPreview.module.css'

/**
 * The evening's page as a visitor will see it, before it is saved.
 *
 * The real public page, in a frame: the same component, the public site's colours rather than
 * the portal's, and — because a frame is a window of its own — the phone layout at phone width
 * rather than the desktop one squeezed. The draft is handed across and nothing is saved.
 *
 * "Play again" is there because two of the cover's movements happen once, as the page opens,
 * and the only other way to see one twice was to change the choice and change it back.
 */
export function EventPreview({ event, onClose }: { event: Event; onClose: () => void }) {
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [replay, setReplay] = useState(0)
  const frame = useRef<HTMLIFrameElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const moves = event.coverAnimation && event.coverAnimation !== 'none' && Boolean(event.coverImageUrl)

  /*
   * The frame says when it is listening, and is sent the page then — and again whenever the
   * page or the replay count changes after that. What to send is read from a ref, so the
   * listener is set up once rather than torn down and re-added on every render.
   */
  const latest = useRef({ event, replay, onClose })
  const listening = useRef(false)
  const send = useCallback(() => {
    const { event: page, replay: times } = latest.current
    frame.current?.contentWindow?.postMessage(previewMessage({ type: 'show', event: page, replay: times }), window.location.origin)
  }, [])
  useEffect(() => {
    latest.current = { event, replay, onClose }
    if (listening.current) send()
  }, [event, replay, onClose, send])
  useEffect(() => {
    const hear = (message: MessageEvent) => {
      const said = readPreviewMessage(message)
      if (said?.type === 'ready') {
        listening.current = true
        send()
      }
      if (said?.type === 'close') latest.current.onClose()
    }
    window.addEventListener('message', hear)
    return () => window.removeEventListener('message', hear)
  }, [send])

  // While it is open it is the screen: the page behind does not scroll, and focus starts on the
  // way out and goes back to whatever opened it.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLButtonElement>('[data-preview-close]')?.focus()
    return () => {
      document.body.style.overflow = overflow
      before?.focus?.()
    }
  }, [])

  const keys = (keyEvent: React.KeyboardEvent) => {
    if (keyEvent.key === 'Escape') {
      keyEvent.stopPropagation()
      onClose()
      return
    }
    if (keyEvent.key !== 'Tab') return
    const focusable = panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), iframe') ?? []
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (keyEvent.shiftKey && document.activeElement === first) {
      keyEvent.preventDefault()
      last?.focus()
    } else if (!keyEvent.shiftKey && document.activeElement === last) {
      keyEvent.preventDefault()
      first?.focus()
    }
  }

  return createPortal(
    <div className={styles.backdrop} onKeyDown={keys}>
      <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="event-preview-title">
        <div className={styles.bar}>
          <div className={styles.titles}>
            <h2 id="event-preview-title" className={styles.title}>
              How the page will look
            </h2>
            <p className={styles.sub}>In the public site’s colours. Nothing here is saved.</p>
          </div>
          <div className={styles.controls}>
            <div className={styles.devices} role="group" aria-label="Preview width">
              {(['desktop', 'phone'] as const).map((which) => (
                <button
                  key={which}
                  type="button"
                  className={device === which ? styles.deviceOn : styles.device}
                  aria-pressed={device === which}
                  onClick={() => setDevice(which)}
                >
                  {which === 'desktop' ? 'Desktop' : 'Phone'}
                </button>
              ))}
            </div>
            {moves ? (
              <button type="button" className={styles.replay} onClick={() => setReplay((n) => n + 1)}>
                ▶ Play again
              </button>
            ) : null}
            <button type="button" className={styles.close} data-preview-close onClick={onClose}>
              <Icon name="close" size={20} />
              <span className={styles.srOnly}>Close the preview</span>
            </button>
          </div>
        </div>
        {moves && reduced ? (
          <p className={styles.reduced} role="note">
            This computer is set to reduce motion, so the cover stands still here — as it does for any visitor who has asked
            for the same. Turn it off in the system’s accessibility settings to watch the movement.
          </p>
        ) : null}
        <div className={styles.stage}>
          <iframe
            ref={frame}
            src={PREVIEW_PATH}
            title={`Preview of the page for ${event.title}`}
            className={device === 'phone' ? styles.phone : styles.desktop}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
