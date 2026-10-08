import { useId } from 'react'
import type { Person } from '@/domain/household'
import styles from './PersonAvatar.module.css'

type Look = 'woman' | 'man' | 'girl' | 'boy' | 'adult' | 'child'

function lookOf(person: Pick<Person, 'ageGroup' | 'shownAs'>): Look {
  const child = person.ageGroup === 'child'
  if (person.shownAs === 'female') return child ? 'girl' : 'woman'
  if (person.shownAs === 'male') return child ? 'boy' : 'man'
  return child ? 'child' : 'adult'
}

/*
 * Drawn, not photographed: a household's page should not need anybody's face, and a picture
 * of a child is exactly the thing the privacy notice promises not to collect. Head and
 * shoulders on a disc, the hair and the size telling woman from man and adult from child.
 * Anybody whose picture was never chosen is a plain silhouette, neither.
 */
const SKIN = '#c68a5e'
const HAIR = '#2b1a14'

function Figure({ look }: { look: Look }) {
  switch (look) {
    case 'woman':
      return (
        <>
          <path d="M18 30c0-11 6-18 14-18s14 7 14 18v15c-3-2-6-3-9-3H27c-3 0-6 1-9 3z" fill={HAIR} />
          <path d="M12 64c0-12 9-19 20-19s20 7 20 19z" fill="#b4372a" />
          <circle cx="32" cy="27" r="11" fill={SKIN} />
          <path d="M20.5 25c1.5-8 6.5-11.5 11.5-11.5S42 17 43.5 25c-5-1.5-9-4-11.5-7-2.5 3-6.5 5.5-11.5 7z" fill={HAIR} />
        </>
      )
    case 'man':
      return (
        <>
          <path d="M12 64c0-12 9-19 20-19s20 7 20 19z" fill="#2f5d8a" />
          <circle cx="32" cy="27" r="11" fill={SKIN} />
          <path d="M20.6 25.5C20.4 17 25.5 12.5 32 12.5s11.6 4.5 11.4 13c-2.5-3.5-6.5-5-11.4-5s-8.9 1.5-11.4 5z" fill={HAIR} />
        </>
      )
    case 'girl':
      return (
        <>
          <circle cx="20" cy="36" r="5" fill={HAIR} />
          <circle cx="44" cy="36" r="5" fill={HAIR} />
          <path d="M19 64c0-9 6-14 13-14s13 5 13 14z" fill="#d9772b" />
          <circle cx="32" cy="35" r="9.5" fill={SKIN} />
          <path d="M22.4 33.5c.8-7 5-10.5 9.6-10.5s8.8 3.5 9.6 10.5c-4-1-7.6-3-9.6-5.6-2 2.6-5.6 4.6-9.6 5.6z" fill={HAIR} />
        </>
      )
    case 'boy':
      return (
        <>
          <path d="M19 64c0-9 6-14 13-14s13 5 13 14z" fill="#3f8f6b" />
          <circle cx="32" cy="35" r="9.5" fill={SKIN} />
          <path d="M22.5 33.5c-.4-6.5 4-11 9.5-11s9.9 4.5 9.5 11c-1.5-2-3-3-4.5-3.4l-1-2.6-1.5 2.2-2.5-2.7-2 2.7-2-2.2-1 2.6c-1.5.4-3 1.4-4.5 3.4z" fill={HAIR} />
        </>
      )
    case 'child':
      return (
        <>
          <path d="M19 64c0-9 6-14 13-14s13 5 13 14z" className={styles.plain} />
          <circle cx="32" cy="35" r="9.5" className={styles.plain} />
        </>
      )
    default:
      return (
        <>
          <path d="M12 64c0-12 9-19 20-19s20 7 20 19z" className={styles.plain} />
          <circle cx="32" cy="27" r="11" className={styles.plain} />
        </>
      )
  }
}

/** A person's picture beside their name. Decorative: the words beside it say who they are. */
export function PersonAvatar({ person, size = 56 }: { person: Pick<Person, 'ageGroup' | 'shownAs'>; size?: number }) {
  const look = lookOf(person)
  const disc = useId()
  return (
    <svg
      className={styles.avatar}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-look={look}
    >
      <defs>
        <clipPath id={disc}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" className={styles.disc} />
      <g clipPath={`url(#${disc})`}>
        {/* Grown from the bottom edge, so the shoulders stay cut by the disc and the face fills it. */}
        <g transform={`translate(32 64) scale(${look === 'girl' || look === 'boy' || look === 'child' ? 1.3 : 1.15}) translate(-32 -64)`}>
          <Figure look={look} />
        </g>
      </g>
    </svg>
  )
}
