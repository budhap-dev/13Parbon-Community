import { useState } from 'react'
import type { CoverAnimation } from '@/domain/cover'
import styles from './CoverImage.module.css'

/**
 * An event's cover photograph, with whatever movement the committee chose.
 *
 * One component so the designer's preview and the public page cannot disagree about what a
 * choice looks like — a preview that flatters is worse than no preview.
 *
 * The movement waits for the photograph. Until it has arrived the frame holds the movement's
 * first frame — nothing yet, for a fade; black and white, for into-colour — and only then does
 * it play. Started with the page instead, a fade on a phone finished before a large photograph
 * had come down, and what the visitor saw was the photograph appearing all at once.
 */
export function CoverImage({
  src,
  alt = '',
  animation = 'none',
  ratio = '16 / 9',
  className,
  empty = 'No cover photograph yet',
}: {
  src?: string
  alt?: string
  animation?: CoverAnimation
  /** CSS aspect-ratio for the frame. */
  ratio?: string
  className?: string
  /** What to show when there is no photograph. */
  empty?: string
}) {
  // Which photograph has arrived, so a new address starts again from its first frame.
  const [arrived, setArrived] = useState<string | null>(null)
  const ready = Boolean(src) && arrived === src

  // Into colour is the then-and-now sweep from the theme's photographs: the same photograph
  // twice, black and white underneath and colour on top, with a seam that carries the colour
  // across from the left. Once, and then it is simply the photograph in colour.
  if (src && animation === 'colour') {
    return (
      <div
        className={[styles.frame, styles.sweep, className].filter(Boolean).join(' ')}
        style={{ aspectRatio: ratio }}
        data-ready={ready || undefined}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setArrived(src)}
          onError={() => setArrived(src)}
          className={`${styles.image} ${styles.then}`}
        />
        <img src={src} alt="" aria-hidden="true" className={`${styles.image} ${styles.now}`} />
        <span className={styles.seam} aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className={[styles.frame, className].filter(Boolean).join(' ')} style={{ aspectRatio: ratio }}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          data-ready={ready || undefined}
          // A photograph that will not load is not held back for ever: the frame shows what it can.
          onLoad={() => setArrived(src)}
          onError={() => setArrived(src)}
          className={[styles.image, animation !== 'none' ? styles[animation] : ''].filter(Boolean).join(' ')}
        />
      ) : (
        <span className={styles.empty}>{empty}</span>
      )}
    </div>
  )
}
