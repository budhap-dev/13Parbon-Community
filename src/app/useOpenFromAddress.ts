import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Opens the one thing `?open=` names, once the list it is in has loaded, then takes it out of
 * the address.
 *
 * The committee's screens open a household, an evening or a message as a piece of state, so
 * nothing outside the screen could say "this one" — which is what the portal's search needs to
 * do, and what a link pasted into the committee's chat needs to do too.
 *
 * Taken out afterwards so that closing the thing again is not undone by the address, and a
 * reload lands on the list rather than reopening a form somebody has already left. An id that
 * is not in the list — deleted since, or never there — is dropped the same way, quietly.
 */
export function useOpenFromAddress<T extends { id: string }>(
  items: readonly T[] | undefined,
  open: (item: T) => void,
): void {
  const [params, setParams] = useSearchParams()
  const wanted = params.get('open')
  // The screen's own way of opening one, as of this render. Held aside so that a new function
  // every render does not count as a reason to open the thing again.
  const latest = useRef(open)
  useEffect(() => {
    latest.current = open
  })

  // Once per arrival. Opening re-renders the screen, and a screen that builds its list as it
  // renders hands back a new one each time, which would open the thing again — and again —
  // before the address had caught up.
  const done = useRef<string | null>(null)

  useEffect(() => {
    if (!wanted) {
      done.current = null
      return
    }
    if (!items || done.current === wanted) return
    done.current = wanted
    const item = items.find((candidate) => candidate.id === wanted)
    if (item) latest.current(item)
    setParams(
      (now) => {
        const next = new URLSearchParams(now)
        next.delete('open')
        return next
      },
      // Tidying the address is not arriving somewhere, so the page stays where it is.
      { replace: true, preventScrollReset: true },
    )
  }, [wanted, items, setParams])
}
