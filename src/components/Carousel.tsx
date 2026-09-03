import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
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
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Photo carousel: scroll-snap track, previous/next, dots, arrow keys, optional auto-advance. */
export function Carousel({ label, items, autoAdvanceMs = 0 }: Props) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const statusId = useId()
  const count = items.length

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return
      const wrapped = ((next % count) + count) % count
      setIndex(wrapped)
      const track = trackRef.current
      if (!track || typeof track.scrollTo !== 'function') return
      const slide = track.children[wrapped] as HTMLElement | undefined
      track.scrollTo({ left: slide?.offsetLeft ?? wrapped * track.clientWidth, behavior: 'smooth' })
    },
    [count],
  )

  const onScroll = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setIndex(Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / track.clientWidth))))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(index + 1)
    }
  }

  useEffect(() => {
    if (!autoAdvanceMs || paused || count < 2 || prefersReducedMotion()) return
    const timer = setInterval(() => goTo(index + 1), autoAdvanceMs)
    return () => clearInterval(timer)
  }, [autoAdvanceMs, paused, count, index, goTo])

  if (count === 0) return null

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
    >
      <ul ref={trackRef} className={styles.track} onScroll={onScroll} aria-describedby={statusId}>
        {items.map((item, i) => (
          <li
            key={item.id}
            className={styles.slide}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
          >
            <figure className={styles.figure}>
              <img className={styles.image} src={item.src} alt={item.alt} loading={i === 0 ? 'eager' : 'lazy'} />
              {item.caption ? <figcaption className={styles.caption}>{item.caption}</figcaption> : null}
            </figure>
          </li>
        ))}
      </ul>

      <p id={statusId} className={styles.status} aria-live="polite">
        Photo {index + 1} of {count}
      </p>

      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => goTo(index - 1)} aria-label="Previous photo">
          <Icon name="chevronLeft" />
        </button>
        <ul className={styles.dots}>
          {items.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                className={i === index ? styles.dotActive : styles.dot}
                onClick={() => goTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
              />
            </li>
          ))}
        </ul>
        <button type="button" className={styles.arrow} onClick={() => goTo(index + 1)} aria-label="Next photo">
          <Icon name="chevronRight" />
        </button>
      </div>
    </section>
  )
}
