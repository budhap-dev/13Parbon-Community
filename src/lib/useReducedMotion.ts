import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

const asks = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches

/**
 * Whether this computer has asked for less movement, kept current if the setting changes.
 *
 * The site honours it — moving covers stand still — and a screen that previews movement needs
 * to say so, or somebody with it switched on sees every animation as "nothing happens".
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(asks)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(QUERY)
    const changed = () => setReduced(query.matches)
    query.addEventListener?.('change', changed)
    return () => query.removeEventListener?.('change', changed)
  }, [])
  return reduced
}
