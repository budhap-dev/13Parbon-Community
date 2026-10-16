import { useState, type ReactNode } from 'react'
import { photoThumb, type Person } from '@/domain/household'
import { PersonAvatar } from './PersonAvatar'
import { useHoverZoom } from './useHoverZoom'
import styles from './PersonPhoto.module.css'

/**
 * A person's picture: their own photograph where they have added one, and the drawn figure
 * where they have not — or where the photograph will not load, so a taken-down file is never a
 * broken-image box. Decorative, like the figure: the name beside it says who they are.
 *
 * The small copy for anything drawn at the size of a disc, the square one above that.
 */
export function PersonPhoto({ person, size = 56 }: { person: Pick<Person, 'ageGroup' | 'shownAs' | 'photo'>; size?: number }) {
  const [failed, setFailed] = useState(false)
  const showing = person.photo && person.ageGroup === 'adult' && !failed ? person.photo : undefined
  const zoom = useHoverZoom(showing)
  if (!showing) return <PersonAvatar person={person} size={size} />
  return (
    <>
      <img
        className={styles.round}
        src={size > 80 ? showing : photoThumb(showing)}
        width={size}
        height={size}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        {...zoom.handlers}
      />
      {zoom.overlay}
    </>
  )
}

/**
 * A monogram that becomes a photograph when there is one: the household's main contact on a
 * household's card, the person on a committee card. `className` is the monogram's own, so the
 * disc keeps its size and place, and `children` — the initials — are what it falls back to.
 */
export function PhotoMono({ photo, className, children }: { photo?: string; className?: string; children: ReactNode }) {
  const [failed, setFailed] = useState<string | null>(null)
  const showing = photo && failed !== photo ? photo : undefined
  const zoom = useHoverZoom(showing)
  return (
    <span className={showing ? `${className ?? ''} ${styles.holder}` : className} aria-hidden="true" {...zoom.handlers}>
      {showing ? <img className={styles.fill} src={photoThumb(showing)} alt="" loading="lazy" onError={() => setFailed(showing)} /> : children}
      {zoom.overlay}
    </span>
  )
}
