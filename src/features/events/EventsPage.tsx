import { Link, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import { LoadFailed } from '@/components/LoadFailed'
import { EventCard } from '@/components/EventCard'
import { formatDateWithYear, formatDayLongMonth, formatMonthYear, monthKey } from '@/domain/dates'
import type { Event } from '@/domain/event'
import { heldThisYear, monthsUntilSeason, type Festival } from '@/domain/festival'
import { useFestivals, usePastEvents, useUpcomingEvents } from '@/lib/api'
import { useNow } from '@/lib/clock'
import { FestivalAlbum } from './FestivalAlbum'
import styles from './Events.module.css'

function groupByMonth(events: Event[]): { key: string; label: string; events: Event[] }[] {
  const groups = new Map<string, { key: string; label: string; events: Event[] }>()
  for (const event of events) {
    const key = monthKey(event.startsAt)
    const group = groups.get(key) ?? { key, label: formatMonthYear(event.startsAt), events: [] }
    group.events.push(event)
    groups.set(key, group)
  }
  return [...groups.values()]
}


type Stop = { festival: Festival; event?: Event; wait: number }

/**
 * The year's festivals in the order they come round from now: a dated one by its date, the rest
 * by the season they usually fall in. An evening's first date counts; later ones are on the
 * calendar above. One already held this year comes round again next year, so it goes last.
 */
function yearAhead(festivals: Festival[], upcoming: Event[], past: Event[], now: Date): Stop[] {
  const month = now.getFullYear() * 12 + now.getMonth()
  return festivals
    .map((festival) => {
      const event = upcoming.find((e) => e.festivalId === festival.id && e.status !== 'cancelled')
      if (event) {
        const at = new Date(event.startsAt)
        return { festival, event, wait: at.getFullYear() * 12 + at.getMonth() - month }
      }
      const season = monthsUntilSeason(festival.season, now) ?? 12
      return { festival, wait: heldThisYear(festival.id, past, now) ? season + 12 : season }
    })
    .sort((a, b) => a.wait - b.wait)
}

export function EventsPage() {
  useDocumentTitle('Events')
  const [params] = useSearchParams()
  const festivalId = params.get('festival')
  const { data: festivals } = useFestivals()
  const { data: upcoming, isPending, isError, isSuccess, refetch } = useUpcomingEvents(50)
  const { data: past, isError: pastFailed, refetch: refetchPast } = usePastEvents(6)
  const now = useNow()

  const matches = (event: Event) => !festivalId || event.festivalId === festivalId
  const upcomingMonths = groupByMonth((upcoming ?? []).filter(matches))
  const pastEvents = (past ?? []).filter(matches)
  const activeFestival = festivals?.find((f) => f.id === festivalId)

  // Only once the calendar has arrived: before then, every festival would look unscheduled.
  // Not under a filter, where the one occasion asked about is already the whole page.
  const stops = isSuccess && !festivalId ? yearAhead(festivals ?? [], upcoming, past ?? [], now) : []
  const arranging = stops.some((stop) => !stop.event)

  return (
    <Container className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>What’s on</h1>
        <p className={styles.intro}>
          Every gathering in the community year. Pick a date, say your household is coming, and the organisers see a real headcount.
        </p>
        {festivals && festivals.length > 0 ? (
          <nav className={styles.filters} aria-label="Filter by occasion">
            <Link to="/events" className={festivalId ? styles.filter : styles.filterActive} aria-current={festivalId ? undefined : 'true'}>
              All
            </Link>
            {festivals.map((festival) => {
              const active = festival.id === festivalId
              return (
                <Link
                  key={festival.id}
                  to={`/events?festival=${festival.id}`}
                  className={active ? styles.filterActive : styles.filter}
                  aria-current={active ? 'true' : undefined}
                >
                  {festival.name}
                </Link>
              )
            })}
          </nav>
        ) : null}
      </header>

      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading the calendar…
        </p>
      ) : isError ? (
        <LoadFailed what="the calendar" onRetry={() => void refetch()} />
      ) : upcomingMonths.length === 0 && (festivalId || stops.length === 0) ? (
        // Unfiltered, the year ahead below names what is coming; with no festivals to name,
        // this line is all that says the calendar is empty rather than broken.
        <div className={styles.none}>
          <p>
            {activeFestival ? `Nothing scheduled yet for ${activeFestival.name}. ` : 'Nothing scheduled yet. '}
            Check back soon, or <Link to="/contact">ask the committee</Link>.
          </p>
          {activeFestival ? <FestivalAlbum festival={activeFestival} /> : null}
        </div>
      ) : (
        upcomingMonths.map((month) => (
          <section key={month.key} className={styles.month} aria-labelledby={`month-${month.key}`}>
            <h2 id={`month-${month.key}`} className={styles.monthTitle}>
              {month.label}
            </h2>
            <ul className={styles.grid}>
              {month.events.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {stops.length > 0 ? (
        <section className={styles.year} aria-labelledby="year-title">
          <p lang="bn" className={styles.kickerBn}>
            আমাদের বছর
          </p>
          <h2 id="year-title" className={styles.yearTitle}>
            The year ahead
          </h2>
          <ol className={styles.timeline}>
            {stops.map(({ festival, event }) => (
              <li key={festival.id} className={event ? styles.stopSet : styles.stop} data-festival={festival.id}>
                <span className={styles.stopDot} aria-hidden="true" />
                {festival.bengaliName ? (
                  <p lang="bn" className={styles.stopBengali}>
                    {festival.bengaliName}
                  </p>
                ) : null}
                <h3 className={styles.stopName}>{festival.name}</h3>
                {event ? (
                  <p className={styles.stopStatus}>
                    <span className={styles.stopChip}>Date set</span>{' '}
                    <Link to={`/events/${event.slug}`}>{formatDayLongMonth(event.startsAt)}</Link>
                  </p>
                ) : (
                  <p className={styles.stopStatus}>
                    <span className={styles.stopChipOpen}>Being arranged</span>
                    {festival.season ? <span className={styles.stopSeason}> {festival.season}</span> : null}
                  </p>
                )}
              </li>
            ))}
          </ol>
          {arranging ? (
            <p className={styles.yearNote}>
              Would you like to hear when the dates are settled?{' '}
              <Link to="/contact">Send the committee a message</Link> and we will let you know.
            </p>
          ) : null}
        </section>
      ) : null}

      {pastFailed ? (
        <section className={styles.month} aria-labelledby="past-title">
          <h2 id="past-title" className={styles.pastTitle}>
            Earlier this year
          </h2>
          <LoadFailed what="the earlier evenings" onRetry={() => void refetchPast()} />
        </section>
      ) : pastEvents.length > 0 ? (
        <section className={styles.month} aria-labelledby="past-title">
          <h2 id="past-title" className={styles.pastTitle}>
            Earlier this year
          </h2>
          <ul className={styles.pastList}>
            {pastEvents.map((event) => (
              <li key={event.id} className={styles.pastItem}>
                <Link to={`/events/${event.slug}`} className={styles.pastLink}>
                  {event.title}
                </Link>
                <span className={styles.pastMeta}>
                  {formatDateWithYear(event.startsAt)}
                  {event.status === 'cancelled' ? ' · cancelled' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  )
}
