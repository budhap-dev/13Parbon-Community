import { useEffect, useRef } from 'react'

/**
 * Goes back to the top when a screen swaps what it is showing without navigating.
 *
 * `ScrollRestoration` handles the address changing. Several of the committee's screens do not
 * change it: the button that opens a form is a piece of state, so pressing *Put up a notice* at
 * the foot of a long page replaces the page with a short form and leaves the window exactly
 * where it was — looking at empty space under the form, with the heading, the way back and the
 * save button all off the top of the screen. It reads as a page with nothing on it.
 *
 * The first render is skipped on purpose. Arriving somewhere is `ScrollRestoration`'s business,
 * including restoring where somebody was when they pressed Back, and this should not fight it.
 */
export function useScrollToTopOn(key: unknown): void {
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    // `scrollTo` rather than `scrollIntoView`: there is nothing to scroll *to* yet, and the
    // sticky header would be scrolled behind anyway.
    window.scrollTo({ top: 0 })
  }, [key])
}
