import { useState } from 'react'
import styles from './SponsorLogo.module.css'

/**
 * A sponsor's logo on a white tile, or their name on one when there is no logo to draw.
 *
 * White whatever the theme, because that is what a logo is made for: most are drawn for paper,
 * and a dark one on the Festival red disappears. The upload flattens a transparent PNG onto
 * white for the same reason, so the tile and the picture meet without a seam.
 *
 * Contained rather than cropped — `CoverImage` crops, and a logo with its edges cut off is a
 * different logo. A picture that will not load falls back to the name rather than to a broken
 * image, so a sponsor whose site moved their file is still thanked.
 *
 * `alt` is the sponsor's name where the logo is all there is to read, and empty where the name
 * is printed beside it — a screen reader saying it twice is not more polite.
 */
/** A name that needs the smaller type: long overall, or with one word too long for a narrow tile. */
const isLongName = (name: string) => name.length > 28 || name.split(/\s+/).some((word) => word.length > 10)

export function SponsorLogo({
  name,
  logo,
  alt,
  className,
  onFailed,
  onShape,
}: {
  name: string
  logo: string
  alt: string
  className?: string
  /** Told when the picture would not load, so the committee's screen can say so. */
  onFailed?: () => void
  /** Told the picture's width over its height once it has loaded, so a very wide one can be flagged. */
  onShape?: (ratio: number) => void
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const drawLogo = logo !== '' && failed !== logo
  return (
    <span className={[styles.tile, className].filter(Boolean).join(' ')}>
      {drawLogo ? (
        <img
          src={logo}
          alt={alt}
          className={styles.logo}
          loading="lazy"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget
            if (naturalWidth && naturalHeight) onShape?.(naturalWidth / naturalHeight)
          }}
          onError={() => {
            setFailed(logo)
            onFailed?.()
          }}
        />
      ) : (
        <span className={isLongName(name) ? styles.longName : styles.name} aria-hidden={alt === '' ? true : undefined}>
          {name}
        </span>
      )}
    </span>
  )
}
