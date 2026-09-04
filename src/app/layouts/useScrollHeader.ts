import { useEffect, useState } from 'react'

export type ScrollHeaderState = {
  /** The page has scrolled past the top, so the bar can pick up a border. */
  scrolled: boolean
  /** The viewer is scrolling down, so the bar slides out of the way. */
  hidden: boolean
}

/**
 * Two thresholds rather than one, so the bar cannot flicker while the viewer hovers on the
 * boundary. Anything that toggles a class on scroll needs this gap.
 */
const COMPACT_ON = 72
const COMPACT_OFF = 24
const HIDE_AFTER = 160
const MIN_DELTA = 8
/** Below this much scrollable page, hiding the bar is more startling than useful. */
const MIN_SCROLLABLE = 1.6
/**
 * Narrower than this and the bar simply stays put. A touch screen has momentum and rubber
 * banding, so the direction of travel flips back and forth many times in a single flick;
 * a bar that answers every one of those slides in and out repeatedly, which is read as the
 * page flickering. On a pointer, scrolling is steady enough for the bar to be worth hiding.
 */
const PINNED_UNDER = 900

/**
 * Tracks scroll position and direction for a sticky header: a border once scrolled, out of
 * the way while scrolling down, back as soon as the viewer scrolls up.
 * `pinned` forces the bar to stay put, for instance while the mobile menu is open.
 *
 * Nothing here may change the header's height. The header is in normal flow, so resizing it
 * moves the page under the viewer, which moves the scroll position, which lands back here:
 * a loop that reads as the bar jumping.
 */
export function useScrollHeader(pinned = false): ScrollHeaderState {
  const [state, setState] = useState<ScrollHeaderState>({ scrolled: false, hidden: false })

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false

    const small =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(`(max-width: ${PINNED_UNDER - 1}px)`)
        : null

    const update = () => {
      ticking = false
      const y = window.scrollY
      const delta = y - lastY
      const worthHiding =
        document.documentElement.scrollHeight > window.innerHeight * MIN_SCROLLABLE

      setState((current) => {
        let scrolled = current.scrolled
        if (y > COMPACT_ON) scrolled = true
        else if (y < COMPACT_OFF) scrolled = false

        let hidden = current.hidden
        if (!worthHiding || small?.matches || y <= HIDE_AFTER) hidden = false
        else if (delta > MIN_DELTA) hidden = true
        else if (delta < -MIN_DELTA) hidden = false

        if (hidden === current.hidden && scrolled === current.scrolled) return current
        return { scrolled, hidden }
      })

      // Only move the reference once the viewer has actually travelled, so momentum
      // scrolling cannot creep past the threshold a pixel at a time.
      if (Math.abs(delta) > MIN_DELTA) lastY = y
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(update)
      else update()
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    small?.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      small?.removeEventListener?.('change', update)
    }
  }, [])

  return pinned ? { scrolled: state.scrolled, hidden: false } : state
}
