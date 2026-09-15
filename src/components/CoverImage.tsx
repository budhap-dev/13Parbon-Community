import type { CoverAnimation } from '@/domain/cover'
import styles from './CoverImage.module.css'

/**
 * An event's cover photograph, with whatever movement the committee chose.
 *
 * One component so the designer's preview and the public page cannot disagree about what a
 * choice looks like — a preview that flatters is worse than no preview.
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
  return (
    <div className={[styles.frame, className].filter(Boolean).join(' ')} style={{ aspectRatio: ratio }}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={[styles.image, animation !== 'none' ? styles[animation] : ''].filter(Boolean).join(' ')}
        />
      ) : (
        <span className={styles.empty}>{empty}</span>
      )}
    </div>
  )
}
