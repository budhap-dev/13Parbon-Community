import { useEffect, useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import type { Event } from '@/domain/event'
import { EventView } from './EventPage'
import { previewMessage, readPreviewMessage } from './previewChannel'
import styles from './Events.module.css'

/**
 * The event designer's draft, on the real event page, inside the designer's preview frame.
 *
 * It has no event of its own: it draws whatever the designer sends, and on its own — somebody
 * landing on the address — it says where it comes from and shows nothing else. Nothing it
 * draws is saved, fetched or anywhere but this frame.
 */
export function EventPreviewPage() {
  const [shown, setShown] = useState<{ event: Event; replay: number } | null>(null)
  useDocumentTitle(shown ? `Preview: ${shown.event.title}` : 'Preview')

  useEffect(() => {
    const parent = window.parent !== window ? window.parent : null
    const hear = (message: MessageEvent) => {
      const said = readPreviewMessage(message)
      if (said?.type === 'show') setShown({ event: said.event, replay: said.replay })
    }
    window.addEventListener('message', hear)
    parent?.postMessage(previewMessage({ type: 'ready' }), window.location.origin)

    // Escape inside the frame never reaches the designer, so it is passed up.
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') parent?.postMessage(previewMessage({ type: 'close' }), window.location.origin)
    }
    document.addEventListener('keydown', keys)
    return () => {
      window.removeEventListener('message', hear)
      document.removeEventListener('keydown', keys)
    }
  }, [])

  if (!shown) {
    return (
      <Container className={styles.detail}>
        <p>This is where the event designer shows an evening before it is saved. Open it from there.</p>
      </Container>
    )
  }
  // Keyed by the replay count, so "Play again" draws the cover afresh and its animation restarts.
  return <EventView key={shown.replay} event={shown.event} />
}
