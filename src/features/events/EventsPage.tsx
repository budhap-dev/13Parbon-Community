import { Link, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import { LoadFailed } from '@/components/LoadFailed'
import { EventCard } from '@/components/EventCard'
import { Icon } from '@/components/Icon'
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


/** "A, B and C", so a sentence about the year reads like a sentence. */
function namesOf(items: { name: string }[]): string {
  const names = items.map((item) => item.name)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const listNames = namesOf

export function EventsPage() {
  useDocumentTitle('Events')
  const [params] = useSearchParams()
  const festivalId = params.get('festival')
  const { data: festivals } = useFestivals()
  const { data: upcoming, isPending, isError, refetch } = useUpcomingEvents(50)
  const { data: past } = usePastEvents(6)

  const matches = (event: Event) => !festivalId || event.festivalId === festivalId
  const upcomingMonths = groupByMonth((upcoming ?? []).filter(matches))
  const pastEvents = (past ?? []).filter(matches)
  const activeFestival = festivals?.find((f) => f.id === festivalId)

  // Occasions the community keeps every year that have no date on the calendar yet. Naming
  // them is warmer than a general promise, and the note disappears once they are all up.
  const scheduled = new Set((upcoming ?? []).map((event) => event.festivalId))
  const awaitingDates = (festivals ?? []).filter((f) => !scheduled.has(f.id))

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

      {!festivalId && awaitingDates.length > 0 ? (
        <aside className={styles.more} aria-labelledby="more-title">
          <h2 id="more-title" className={styles.moreTitle}>
            <Icon name="calendar" size={24} className={styles.moreIcon} />
            More of the year to come
          </h2>
          <p className={styles.moreText}>
            We hold {listNames(festivals ?? [])} every year. {namesOf(awaitingDates)}{' '}
            {awaitingDates.length === 1 ? 'is' : 'are'} still being arranged, and{' '}
            {awaitingDates.length === 1 ? 'it' : 'they'} will appear here as soon as the{' '}
            {awaitingDates.length === 1 ? 'date is' : 'dates are'} settled.
          </p>
          <p className={styles.moreText}>
            Would you like to hear when they are? <Link to="/contact">Send the committee a message</Link> and we
            will let you know.
          </p>
        </aside>
      ) : null}

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
