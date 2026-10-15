import { useEffect, useRef, type RefObject, type TouchEvent } from 'react'

type Drag = {
  x: number
  y: number
  at: number
  /** How far the finger has pushed it out, never back past where it started. */
  out: number
  /** Decided once the finger has moved a little: sideways is ours, up and down is a scroll. */
  sideways: boolean | null
}

/** How far a finger moves before it has said which way it is going. */
const SETTLE = 8

/**
 * Pushing a drawer back out the way it came, with a finger: leftwards for one that came in from
 * the left (the portal's), rightwards for one from the right (the public site's).
 *
 * The drawer follows the finger while it is down and the shade behind thins with it. Let go far
 * enough — or quickly enough, a flick — and it carries on and shuts; otherwise it springs back.
 * Up and down is left alone, so the drawer's own list still scrolls.
 *
 * The moving is done on the elements' own style rather than through state: a re-render on every
 * touchmove is sixty a second, and the drawer would trail the finger it is meant to be under.
 */
export function useSwipeToClose({
  panel,
  shade,
  open,
  onClose,
  side = 'left',
}: {
  panel: RefObject<HTMLElement | null>
  shade: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  /** The edge the drawer comes in from, and so goes back out to. */
  side?: 'left' | 'right'
}) {
  const away = side === 'left' ? -1 : 1
  const drag = useRef<Drag | null>(null)

  // Once shut, whatever the finger left on the elements goes, and the stylesheet has them again.
  useEffect(() => {
    if (open) return
    for (const el of [panel.current, shade.current]) {
      el?.style.removeProperty('transform')
      el?.style.removeProperty('transition')
      el?.style.removeProperty('opacity')
    }
  }, [open, panel, shade])

  const onTouchStart = (event: TouchEvent) => {
    if (!open || event.touches.length !== 1) return
    const touch = event.touches[0]
    drag.current = { x: touch.clientX, y: touch.clientY, at: performance.now(), out: 0, sideways: null }
  }

  const onTouchMove = (event: TouchEvent) => {
    const now = drag.current
    if (!now) return
    const touch = event.touches[0]
    const dx = touch.clientX - now.x
    const dy = touch.clientY - now.y
    if (now.sideways === null) {
      if (Math.abs(dx) < SETTLE && Math.abs(dy) < SETTLE) return
      now.sideways = Math.abs(dx) > Math.abs(dy)
    }
    if (!now.sideways) {
      drag.current = null
      return
    }
    now.out = Math.max(0, dx * away)
    const width = panel.current?.offsetWidth || 1
    if (panel.current) {
      panel.current.style.setProperty('transition', 'none')
      panel.current.style.setProperty('transform', `translateX(${now.out * away}px)`)
    }
    if (shade.current) {
      shade.current.style.setProperty('transition', 'none')
      shade.current.style.setProperty('opacity', String(Math.max(0, 1 - now.out / width)))
    }
  }

  const onTouchEnd = () => {
    const now = drag.current
    drag.current = null
    if (!now?.sideways) return
    const width = panel.current?.offsetWidth || 1
    const speed = now.out / Math.max(1, performance.now() - now.at)
    const shut = now.out > width * 0.3 || (now.out > 30 && speed > 0.5)

    // Hand the movement back to the stylesheet's own timing for the rest of the way.
    panel.current?.style.removeProperty('transition')
    shade.current?.style.removeProperty('transition')
    if (shut) {
      // Held at the edge it is going to, so nothing snaps back open in the frame before React
      // has caught up with the drawer being shut.
      if (panel.current) panel.current.style.setProperty('transform', `translateX(${away * 100}%)`)
      if (shade.current) shade.current.style.setProperty('opacity', '0')
      onClose()
    } else {
      panel.current?.style.removeProperty('transform')
      shade.current?.style.removeProperty('opacity')
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd }
}
