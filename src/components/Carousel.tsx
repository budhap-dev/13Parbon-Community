import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from './Icon'
import styles from './Carousel.module.css'

export type CarouselItem = {
  id: string
  src: string
  alt: string
  caption?: string
}

type Props = {
  /** Accessible name for the carousel region. */
  label: string
  items: CarouselItem[]
  /** Auto-advance interval. 0 disables. Pauses on hover and focus, and respects reduced motion. */
  autoAdvanceMs?: number
  /** Given, each photograph becomes a button. Only a real tap fires it, never a swipe. */
  onSelect?: (index: number) => void
}

/** How far a press may drift and still count as a tap rather than the start of a swipe. */
const TAP_SLOP_PX = 8

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * A strip of photographs that scrolls a screenful at a time: several are in view at once, and
 * the arrows and dots move between pages rather than between single pictures.
 *
 * How many fit is decided by the stylesheet, not by a prop — the slide width is a percentage
 * that changes with the viewport — so this measures the track instead of being told. Where
 * nothing can be measured (a server, a test) it falls back to one photograph per page, which
 * is the narrowest sensible reading and keeps the controls working.
 */
export function Carousel({ label, items, autoAdvanceMs = 0, onSelect }: Props) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [perView, setPerView] = useState(1)
  const [paused, setPaused] = useState(false)
  const statusId = useId()
  /**
   * Where a press began, and how far the strip had been scrolled at the time. A swipe ends
   * with a click too, so without this every swipe would also open a photograph.
   */
  const pressRef = useRef<{ x: number; y: number; scrollLeft: number } | null>(null)
  const count = items.length
  const pages = Math.max(1, Math.ceil(count / perView))

  // Re-measure whenever the track changes size, since the slide width is a percentage.
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const slide = track.children[0] as HTMLElement | undefined
      const slideWidth = slide?.getBoundingClientRect().width ?? 0
      if (!slideWidth || !track.clientWidth) return
      setPerView(Math.max(1, Math.round(track.clientWidth / slideWidth)))
    }
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [count])

  const goTo = useCallback(
    (next: number) => {
      if (pages === 0) return
      const wrapped = ((next % pages) + pages) % pages
      setPage(wrapped)
      const track = trackRef.current
      if (!track || typeof track.scrollTo !== 'function') return
      track.scrollTo({ left: wrapped * track.clientWidth, behavior: 'smooth' })
    },
    [pages],
  )

  const onScroll = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setPage(Math.max(0, Math.min(pages - 1, Math.round(track.scrollLeft / track.clientWidth))))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(page - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(page + 1)
    }
  }

  useEffect(() => {
    if (!autoAdvanceMs || paused || pages < 2 || prefersReducedMotion()) return
    const timer = setInterval(() => goTo(page + 1), autoAdvanceMs)
    return () => clearInterval(timer)
  }, [autoAdvanceMs, paused, pages, page, goTo])

  if (count === 0) return null

  const first = page * perView + 1
  const last = Math.min(count, (page + 1) * perView)

  return (
    <section
      className={styles.carousel}
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <div className={styles.viewport}>
        {pages > 1 ? (
          <button type="button" className={styles.prev} onClick={() => goTo(page - 1)} aria-label="Previous photos">
            <Icon name="chevronLeft" />
          </button>
        ) : null}

        {/* Every photograph stays in the accessibility tree: with several in view at once,
            hiding the ones outside the current page would hide pictures people can see. */}
        <ul ref={trackRef} className={styles.track} onScroll={onScroll} aria-describedby={statusId}>
          {items.map((item, i) => (
            <li key={item.id} className={styles.slide} aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
              <figure className={styles.figure}>
                {onSelect ? (
                  <button
                    type="button"
                    className={styles.open}
                    onPointerDown={(event) => {
                      pressRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                        scrollLeft: trackRef.current?.scrollLeft ?? 0,
                      }
                    }}
                    onClick={(event) => {
                      const press = pressRef.current
                      pressRef.current = null
                      // No press at all means the keyboard got here, which is always meant.
                      // A swipe moves the finger, or the strip, or both: either disqualifies it.
                      const swiped =
                        press !== null &&
                        (Math.hypot(event.clientX - press.x, event.clientY - press.y) > TAP_SLOP_PX ||
                          Math.abs((trackRef.current?.scrollLeft ?? 0) - press.scrollLeft) > TAP_SLOP_PX)
                      if (swiped) return
                      onSelect(i)
                    }}
                    aria-label={`Open photo ${i + 1} of ${count} full size`}
                  >
                    <img className={styles.image} src={item.src} alt={item.caption ? '' : item.alt} loading={i < 6 ? 'eager' : 'lazy'} />
                  </button>
                ) : (
                  <img className={styles.image} src={item.src} alt={item.caption ? '' : item.alt} loading={i < 6 ? 'eager' : 'lazy'} />
                )}
                {item.caption ? <figcaption className={styles.caption}>{item.caption}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>

        {pages > 1 ? (
          <button type="button" className={styles.next} onClick={() => goTo(page + 1)} aria-label="Next photos">
            <Icon name="chevronRight" />
          </button>
        ) : null}
      </div>

      <p id={statusId} className={styles.status} aria-live="polite">
        {first === last ? `Photo ${first} of ${count}` : `Photos ${first} to ${last} of ${count}`}
      </p>

      {pages > 1 ? (
        <ul className={styles.dots}>
          {Array.from({ length: pages }, (_, i) => (
            <li key={i}>
              <button
                type="button"
                className={i === page ? styles.dotActive : styles.dot}
                onClick={() => goTo(i)}
                aria-label={`Go to photos ${i + 1}`}
                aria-current={i === page ? 'true' : undefined}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
