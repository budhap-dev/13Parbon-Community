import { useEffect, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import styles from './PersonPhoto.module.css'

/** How large the enlarged face is drawn, in screen pixels. */
const SIZE = 200
const MARGIN = 8

/**
 * A photograph drawn larger while the pointer is over it.
 *
 * The large one floats above the page rather than growing in place: the discs sit inside cards
 * that clip what spills over their edges, and a face cut off by its own card is worse than none.
 * It is centred on the small one and kept on screen, and it goes as soon as the page scrolls.
 *
 * Only where there is a pointer that hovers. On a phone a press is a press, and a face that
 * leapt out under a thumb on the way to a button would be in the way.
 */
export function useHoverZoom(photo: string | undefined) {
  const [at, setAt] = useState<DOMRect | null>(null)
  const canHover = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)

  useEffect(() => {
    if (!at) return
    const close = () => setAt(null)
    window.addEventListener('scroll', close, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', close, { capture: true })
  }, [at])

  const handlers =
    photo && canHover
      ? {
          onMouseEnter: (event: MouseEvent<HTMLElement>) => setAt(event.currentTarget.getBoundingClientRect()),
          onMouseLeave: () => setAt(null),
        }
      : {}

  const overlay =
    at && photo
      ? createPortal(
          <img
            className={styles.zoom}
            src={photo}
            alt=""
            aria-hidden="true"
            width={SIZE}
            height={SIZE}
            style={{
              left: Math.min(Math.max(MARGIN, at.left + at.width / 2 - SIZE / 2), window.innerWidth - SIZE - MARGIN),
              top: Math.min(Math.max(MARGIN, at.top + at.height / 2 - SIZE / 2), window.innerHeight - SIZE - MARGIN),
            }}
          />,
          document.body,
        )
      : null

  return { handlers, overlay }
}
