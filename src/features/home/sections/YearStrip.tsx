import { Link } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { SectionHeading } from '@/components/SectionHeading'
import { formatDayLongMonth } from '@/domain/dates'
import { festivalStatus, type FestivalStatus } from '@/domain/festival'
import { photosAwaited } from '@/domain/gallery'
import { SponsoredBy } from '@/features/sponsors/SponsoredBy'
import { useAlbums, useFestivals, useNextEvent, usePastEvents, useUpcomingEvents } from '@/lib/api'
import { useNow } from '@/lib/clock'
import { FestivalGlyph } from '../FestivalGlyph'
import styles from '../Home.module.css'

function describe(status: FestivalStatus): string {
  switch (status.kind) {
    case 'next':
      return 'Next up'
    case 'set':
      return `Date set: ${formatDayLongMonth(status.startsAt)}`
    case 'held':
      return `Held ${formatDayLongMonth(status.startsAt)}`
    case 'arranging':
      return 'Being arranged'
  }
}

/**
 * The community's year, told in words rather than photographs: what each occasion is, for
 * somebody who has never been to one, and where it stands this year.
 */
export function YearStrip() {
  const { data: festivals } = useFestivals()
  const { data: next } = useNextEvent()
  const { data: upcoming } = useUpcomingEvents(50)
  const { data: past } = usePastEvents(10)
  const { showPhotos } = useSettings()
  const { data: albums } = useAlbums()
  const now = useNow()
  const dated = (upcoming ?? []).filter((event) => event.status !== 'cancelled')

  if (!festivals || festivals.length === 0) return null

  return (
    <div className={styles.band}>
      <Container>
        <section className={styles.year} aria-labelledby="year-title">
          <div>
            <p lang="bn" className={styles.kickerBn}>
              আমাদের বছর
            </p>
            <SectionHeading id="year-title" title="Our year" action={{ label: 'See the calendar', to: '/events' }} />
          </div>
          <ul className={styles.occasions}>
            {festivals.map((festival) => {
              const status = festivalStatus(festival.id, dated, past ?? [], next?.festivalId, now)
              return (
                <li key={festival.id} className={styles.occasion} data-festival={festival.id} data-status={status.kind}>
                  <div className={styles.occasionBand}>
                    <FestivalGlyph id={festival.id} />
                    {festival.bengaliName ? (
                      <p lang="bn" className={styles.occasionBengali}>
                        {festival.bengaliName}
                      </p>
                    ) : null}
                  </div>
                  <div className={styles.occasionBody}>
                    <h3 className={styles.occasionName}>
                      <Link to={`/events?festival=${festival.id}`} className={styles.occasionLink}>
                        {festival.name}
                      </Link>
                    </h3>
                    <div className={styles.occasionMeta}>
                      {festival.season ? <span className={styles.occasionSeason}>{festival.season}</span> : null}
                      <span className={styles.occasionChip}>{describe(status)}</span>
                      {/* Just held, and nothing in the gallery from it yet: say the pictures are on their way.
                          Goes by itself once an album for this festival is published. */}
                      {status.kind === 'held' && showPhotos && albums && photosAwaited(festival.id, status.startsAt, albums) ? (
                        <span className={styles.occasionPhotos}>
                          <Icon name="image" size={16} /> Photographs coming soon
                        </span>
                      ) : null}
                    </div>
                    {festival.description ? <p className={styles.occasionText}>{festival.description}</p> : null}
                    {/* Unlinked: the whole card is already the link to this festival's evenings. */}
                    <SponsoredBy festivalId={festival.id} linked={false} className={styles.occasionSponsors} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </Container>
    </div>
  )
}
