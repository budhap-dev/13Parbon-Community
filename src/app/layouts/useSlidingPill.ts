import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

/**
 * A highlight that slides from the link you were on to the one you are on now.
 *
 * Measured rather than laid out, because it has to travel between links: the box's current link
 * (`aria-current="page"`, which NavLink sets) is found, and its place and size are written to
 * the box as --pill-x, --pill-y, --pill-w and --pill-h, with --pill-o at 1 while there is one.
 * The menu draws a pill from those, and transitions them. Measured against the box's scrolled
 * content, so a sidebar that scrolls carries the pill with it.
 *
 * Returns whether the pill has been placed once. The menu should only transition after that:
 * from the first paint the pill would fly in from the corner.
 */
export function useSlidingPill(box: RefObject<HTMLElement | null>, where: unknown): boolean {
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const place = () => {
      const on = el.querySelector<HTMLElement>('a[aria-current="page"]')
      // On a screen the menu does not list, or a menu not showing at this width.
      if (!on || on.offsetWidth === 0) {
        el.style.setProperty('--pill-o', '0')
        return
      }
      const outer = el.getBoundingClientRect()
      const r = on.getBoundingClientRect()
      // Less the box's own border: the pill is placed from inside it, the measures from outside.
      el.style.setProperty('--pill-x', `${r.left - outer.left - el.clientLeft + el.scrollLeft}px`)
      el.style.setProperty('--pill-y', `${r.top - outer.top - el.clientTop + el.scrollTop}px`)
      el.style.setProperty('--pill-w', `${r.width}px`)
      el.style.setProperty('--pill-h', `${r.height}px`)
      el.style.setProperty('--pill-o', '1')
    }
    place()
    if (typeof ResizeObserver === 'undefined') return
    // Webfonts change the labels' widths after the first paint, and a count appearing beside a
    // link can move the ones under it; both resize the box.
    const watch = new ResizeObserver(place)
    watch.observe(el)
    // A scrolling box keeps its own size while what is in it grows, so its contents too.
    for (const child of el.children) watch.observe(child)
    void document.fonts?.ready.then(place)
    return () => watch.disconnect()
  }, [box, where])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return ready
}
