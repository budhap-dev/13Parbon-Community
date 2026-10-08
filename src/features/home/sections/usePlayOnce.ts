import { useEffect, useState, type RefObject } from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'

/**
 * Whether a piece of the page is still, waiting to be seen, or playing its one animation.
 *
 * `waiting` hides what is about to move, and it is decided before the first paint — set any
 * later and the block shows, vanishes and comes back, which is worse than not animating at all.
 * So it is only ever chosen where it will certainly be resolved: a browser that can say when
 * something comes into view, on a computer that has not asked for less movement. Anything else
 * gets `still`, which is the finished picture.
 *
 * Once played it stays played. Scrolling back past it does not start it again.
 */
export type Motion = 'still' | 'waiting' | 'playing'

export function usePlayOnce(target: RefObject<Element | null>): Motion {
  const reduced = useReducedMotion()
  const [motion, setMotion] = useState<Motion>(() =>
    !reduced && typeof window !== 'undefined' && 'IntersectionObserver' in window ? 'waiting' : 'still',
  )

  useEffect(() => {
    if (motion !== 'waiting') return
    const element = target.current
    if (!element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMotion('playing')
          observer.disconnect()
        }
      },
      // A little before it is fully in view, so the garland is being strung as it arrives.
      { threshold: 0.15 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [motion, target])

  // Asked for less movement after the page opened: whatever has not played yet stays still.
  return reduced && motion === 'waiting' ? 'still' : motion
}
