import { useRef, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import { SponsorLogo } from '@/components/SponsorLogo'
import { GROUP_TITLES, groupByLevel, type SponsorGroup } from '@/domain/sponsors'
import styles from '../Home.module.css'
import { usePlayOnce } from './usePlayOnce'

/** The grid each level's tiles sit in, and the padding round a logo the size of that tile. */
const LIST_CLASS = { gold: styles.sponsorsGold, silver: styles.sponsorsSilver, friend: styles.sponsorsFriend, '': styles.sponsorsSilver }
const TILE_CLASS = { gold: undefined, silver: styles.tileSilver, friend: styles.tileFriend, '': styles.tileSilver }

/** How many lamps sit under the logos. Every other one drops out on a narrow phone. */
const DIYAS = 7

/** The marigold string the logos hang from. One curve, drawn three times: thread and two colours of flower. */
function Garland() {
  const curve = 'M0 6 Q 250 34 500 14 T 1000 8'
  return (
    <svg className={styles.garland} viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className={styles.garlandThread} vectorEffect="non-scaling-stroke" d={curve} />
      <path className={styles.garlandMarigold} vectorEffect="non-scaling-stroke" d={curve} />
      <path className={styles.garlandMarigoldDeep} vectorEffect="non-scaling-stroke" d={curve} />
    </svg>
  )
}

/** A clay diya, dotted like painted terracotta, with a two-colour flame. */
function Diya() {
  return (
    <svg viewBox="0 0 48 48" focusable="false">
      <g className={styles.diyaFlame}>
        <path d="M24 3c5 7 6 12 0 19-6-7-5-12 0-19z" fill="#ff8c1a" />
        <path d="M24 9c3 4 3 8 0 12-3-4-3-8 0-12z" fill="#ffd166" />
      </g>
      <path d="M24 21v4" stroke="#3a0a06" strokeWidth="1.6" />
      <path d="M5 26h38c-1 3-2 5-4 7l6-1c-2 5-11 11-21 11S7 37 5 26z" fill="#b5532a" />
      <ellipse cx="24" cy="26" rx="19" ry="3.6" fill="#8a3a1c" />
      <ellipse cx="24" cy="26" rx="15" ry="2.2" fill="#e9a23b" />
      <g fill="#f3d9b1">
        <circle cx="13" cy="33" r="1.3" />
        <circle cx="19" cy="36" r="1.3" />
        <circle cx="25" cy="37" r="1.3" />
        <circle cx="31" cy="36" r="1.3" />
      </g>
    </svg>
  )
}

/**
 * The sponsors' logos, gold largest, on the way down the home page — hung from a marigold
 * garland, with a row of diyas lit underneath.
 *
 * Logos only, and each one goes to the sponsor's own entry on the Sponsors page rather than to
 * their website: that page says who they are first, and it keeps every sponsored link on the
 * site in one place.
 *
 * It moves once. The first time the block comes into view the garland is strung, the logos drop
 * onto it one after another, and the diyas light left to right; the flames flicker for a few
 * seconds and then burn still, so nothing on the page is still moving after five seconds and
 * nobody needs a pause button. Never a strip that scrolls on its own: half of it is always off
 * the edge, and nobody can read a logo that is moving. For anybody who has asked for less
 * movement, and in any browser that cannot say when the block is in view, it is simply there,
 * lamps lit. See `usePlayOnce`.
 *
 * Draws nothing while there is nobody on show, so a committee that switches sponsors on before
 * the list is ready gets an unchanged home page rather than an empty heading.
 */
export function SponsorsStrip() {
  const { sponsors } = useSettings()
  const groups = groupByLevel(sponsors)
  if (groups.length === 0) return null
  return <Garlanded groups={groups} />
}

/**
 * The block itself, apart so that it only exists once there is somebody to show. The settings
 * arrive after the first render; a section watched for coming into view before it was on the
 * page was never watched at all, and would have waited, invisible, for ever.
 */
function Garlanded({ groups }: { groups: SponsorGroup[] }) {
  const section = useRef<HTMLElement>(null)
  const motion = usePlayOnce(section)

  // One count across all the levels, so the logos drop along the garland in reading order.
  let order = 0

  return (
    <Container>
      <section ref={section} className={styles.sponsors} aria-labelledby="sponsors-title" data-motion={motion}>
        <SectionHeading id="sponsors-title" title="Our sponsors" action={{ label: 'All our sponsors', to: '/sponsors' }} />
        <div className={styles.garlanded}>
          <Garland />
          {groups.map((group) => (
            <div key={group.level || 'none'} className={styles.sponsorGroup}>
              {groups.length > 1 ? <h3 className={styles.sponsorGroupTitle}>{GROUP_TITLES[group.level]}</h3> : null}
              <ul className={LIST_CLASS[group.level]}>
                {group.sponsors.map((sponsor) => (
                  <li key={sponsor.id} className={styles.hanging} style={{ '--i': order++ } as CSSProperties}>
                    <Link to={`/sponsors#${sponsor.id}`} className={styles.sponsorLink}>
                      {/* The logo is all there is to read, so it carries the name. */}
                      <SponsorLogo
                        name={sponsor.name}
                        logo={sponsor.logo}
                        alt={sponsor.name}
                        className={TILE_CLASS[group.level]}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ul className={styles.diyas} aria-hidden="true">
          {Array.from({ length: DIYAS }, (_, i) => (
            <li key={i} className={styles.diya} style={{ '--i': i } as CSSProperties}>
              <Diya />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  )
}
