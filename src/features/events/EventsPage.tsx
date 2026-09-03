import { Link, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import { EventCard } from '@/components/EventCard'
import { formatMonthYear, monthKey } from '@/domain/dates'
import type { Event } from '@/domain/event'
import { useFestivals, usePastEvents, useUpcomingEvents } from '@/lib/api'
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

export function EventsPage() {
  useDocumentTitle('Events')
  const [params] = useSearchParams()
  const festivalId = params.get('festival')
  const { data: festivals } = useFestivals()
  const { data: upcoming, isPending } = useUpcomingEvents(50)
  const { data: past } = usePastEvents(6)

  const matches = (event: Event) => !festivalId || event.festivalId === festivalId
  const upcomingMonths = groupByMonth((upcoming ?? []).filter(matches))
  const pastEvents = (past ?? []).filter(matches)
  const activeFestival = festivals?.find((f) => f.id === festivalId)

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
      ) : upcomingMonths.length === 0 ? (
        <p className={styles.empty}>
          {activeFestival ? `Nothing scheduled yet for ${activeFestival.name}. ` : 'Nothing scheduled yet. '}
          Check back soon, or <Link to="/contact">ask the committee</Link>.
        </p>
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

      {pastEvents.length > 0 ? (
        <section className={styles.month} aria-labelledby="past-title">
          <h2 id="past-title" className={styles.pastTitle}>
            Earlier this year
          </h2>
          <ul className={styles.grid}>
            {pastEvents.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  )
}
