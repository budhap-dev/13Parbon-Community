import { useEffect, useState } from 'react'

export type ScrollHeaderState = {
  /** The page has scrolled past the top, so the bar can compact and pick up a backdrop. */
  scrolled: boolean
  /** The viewer is scrolling down, so the bar slides out of the way. */
  hidden: boolean
}

const COMPACT_AFTER = 24
const HIDE_AFTER = 120
const MIN_DELTA = 6

/**
 * Tracks scroll position and direction for a sticky header: compact once scrolled,
 * hidden while scrolling down, shown again as soon as the viewer scrolls up.
 * `pinned` forces the bar to stay visible, e.g. while the mobile menu is open.
 */
export function useScrollHeader(pinned = false): ScrollHeaderState {
  const [state, setState] = useState<ScrollHeaderState>({ scrolled: false, hidden: false })

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false

    const update = () => {
      ticking = false
      const y = window.scrollY
      const delta = y - lastY
      const scrolled = y > COMPACT_AFTER
      setState((current) => {
        let hidden = current.hidden
        if (y <= HIDE_AFTER) hidden = false
        else if (delta > MIN_DELTA) hidden = true
        else if (delta < -MIN_DELTA) hidden = false
        if (hidden === current.hidden && scrolled === current.scrolled) return current
        return { scrolled, hidden }
      })
      lastY = y
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(update)
      else update()
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return pinned ? { scrolled: state.scrolled, hidden: false } : state
}
