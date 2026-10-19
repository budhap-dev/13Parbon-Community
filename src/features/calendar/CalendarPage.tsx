import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { RITUAL_YEARS, rituals } from '@/app/bengaliYear'
import { Container } from '@/components/Container'
import { LoadFailed } from '@/components/LoadFailed'
import {
  BENGALI_MONTHS,
  BENGALI_WEEKDAYS,
  bengaliDigits,
  civilDate,
  formatBengaliDate,
  formatCivil,
  monthLength,
  monthStarts,
  toBengali,
  addCivilDays,
} from '@/domain/bengaliDate'
import {
  comingUp,
  compareMonths,
  entriesBetween,
  entriesOn,
  eveningEntry,
  formatSpan,
  touchesDay,
  kindLabel,
  monthParam,
  monthView,
  readMonthParam,
  ritualEntry,
  shiftMonth,
  type CalendarEntry,
  type MonthRef,
} from '@/domain/ritual'
import { usePastEvents, useUpcomingEvents } from '@/lib/api'
import { useNow } from '@/lib/clock'
import { KindMark } from './KindMark'
import { RitualIcon } from './RitualIcon'
import styles from './Calendar.module.css'

const ENGLISH_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** For a phone's narrow columns, where বৃহস্পতি runs into Friday: Thursday as almanacs shorten it. */
const SHORT_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']

/** The months the page will go to: the first year entered, to the end of the year after the last. */
const FIRST_MONTH: MonthRef = { year: Math.min(...RITUAL_YEARS), month: 0 }
const LAST_MONTH: MonthRef = { year: Math.max(...RITUAL_YEARS) + 1, month: 11 }

const clampMonth = (ref: MonthRef) =>
  compareMonths(ref, FIRST_MONTH) < 0 ? FIRST_MONTH : compareMonths(ref, LAST_MONTH) > 0 ? LAST_MONTH : ref

const monthName = ({ month }: MonthRef) => BENGALI_MONTHS[month].name
const bengaliMonthName = ({ month }: MonthRef) => BENGALI_MONTHS[month].bengaliName

/** "Sat 17 Oct", or "Sat 17 – Wed 21 Oct" for an entry that runs over days. */
function dayRange(entry: CalendarEntry): string {
  const one = (iso: string) => formatCivil(iso, { weekday: 'short', day: 'numeric', month: 'short' })
  if (entry.start === entry.end) return one(entry.start)
  const sameMonth = entry.start.slice(0, 7) === entry.end.slice(0, 7)
  const from = sameMonth ? formatCivil(entry.start, { weekday: 'short', day: 'numeric' }) : one(entry.start)
  return `${from} – ${one(entry.end)}`
}

/** "18 October – 16 November 2026" */
function monthSpan(first: string, last: string): string {
  const sameYear = first.slice(0, 4) === last.slice(0, 4)
  return `${formatCivil(first, sameYear ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' })} – ${formatCivil(last, { day: 'numeric', month: 'long', year: 'numeric' })}`
}

const monthOf = (iso: string): MonthRef => {
  const { year, month } = toBengali(iso)
  return { year, month }
}

/**
 * Lanes for the month's entries, so a puja running over five days keeps to one line across them
 * rather than jumping up and down as other things start and stop beside it.
 */
function laneOf(entries: CalendarEntry[]): Map<string, number> {
  const lanes = new Map<string, number>()
  const busyUntil: string[] = []
  for (const entry of entries) {
    let lane = busyUntil.findIndex((until) => until < entry.start)
    if (lane < 0) lane = busyUntil.length
    busyUntil[lane] = entry.end
    lanes.set(entry.key, lane)
  }
  return lanes
}

function EntryName({ entry }: { entry: CalendarEntry }) {
  return (
    <>
      {entry.bengaliName ? (
        <span lang="bn" className={styles.entryBengali}>
          {entry.bengaliName}
        </span>
      ) : null}{' '}
      <span className={styles.entryEnglish}>{entry.name}</span>
    </>
  )
}

/** The drawing for an entry, or its kind's mark when it has none — an evening with no festival. */
function Picture({ entry, className }: { entry: CalendarEntry; className: string }) {
  return (
    <span className={className} data-kind={entry.kind}>
      {entry.icon ? <RitualIcon id={entry.icon} /> : <KindMark kind={entry.kind} />}
    </span>
  )
}

/**
 * When it begins and ends, in UK time with Kolkata's beside it. The tithi is one moment the
 * world over; it is only the clock that differs.
 */
function Times({ entry, on }: { entry: CalendarEntry; on?: string }) {
  const times = (entry.times ?? []).filter((time) => !on || touchesDay(time, on))
  if (times.length === 0) return null
  const evening = entry.kind === 'evening'
  return (
    <dl className={styles.times}>
      {times.map((time) => (
        <div key={`${time.label}-${time.from}`} className={styles.time}>
          <dt>{time.label}</dt>
          <dd>
            {formatSpan(time, 'uk')}
            {evening ? null : <span className={styles.kolkata}> UK time · {formatSpan(time, 'kolkata')} in Kolkata</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Where an entry in "coming up" goes: an evening to its page, the rest to their month. */
function entryHref(entry: CalendarEntry): string {
  return entry.href ?? `/calendar?month=${monthParam(monthOf(entry.start))}#entry-${entry.key}`
}

function TodayPanel({ today, entries }: { today: string; entries: CalendarEntry[] }) {
  const now = entriesOn(entries, today)
  const next = comingUp(entries, today)
  return (
    <section className={styles.today} aria-labelledby="today-title">
      <h2 id="today-title" className={styles.todayTitle}>
        Today
      </h2>
      <p className={styles.todayDate}>
        <span lang="bn">আজ {formatBengaliDate(toBengali(today))}</span>
        <span aria-hidden="true"> · </span>
        {/* In two halves: with the year in it, en-GB puts a comma after the weekday. */}
        <span>
          {formatCivil(today, { weekday: 'long' })} {formatCivil(today, { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </p>
      {now.length > 0 ? (
        <ul className={styles.todayList}>
          {now.map((entry) => {
            const day = entry.days?.find((d) => d.date === today)
            return (
              <li key={entry.key} className={styles.todayItem} data-kind={entry.kind}>
                <Picture entry={entry} className={styles.todayPicture} />
                <div>
                  <p className={styles.todayName}>
                    {day ? (
                      <>
                        {day.bengaliName ? (
                          <span lang="bn" className={styles.entryBengali}>
                            {day.bengaliName}
                          </span>
                        ) : null}{' '}
                        <span className={styles.entryEnglish}>
                          {day.name}: {entry.name}
                        </span>
                      </>
                    ) : (
                      <EntryName entry={entry} />
                    )}
                    <span className="sr-only">, {kindLabel(entry.kind)}</span>
                  </p>
                  {entry.description ? <p className={styles.todayText}>{entry.description}</p> : null}
                  <Times entry={entry} on={today} />
                  {entry.href ? <Link to={entry.href}>See the evening</Link> : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={styles.todayText}>Nothing marked for today.</p>
      )}
      {next.length > 0 ? (
        <div className={styles.comingUp}>
          <h3 className={styles.comingTitle}>Coming up</h3>
          <ul className={styles.comingList}>
            {next.map((entry) => (
              <li key={entry.key} data-kind={entry.kind}>
                <KindMark kind={entry.kind} className={styles.mark} />
                <Link to={entryHref(entry)}>{entry.name}</Link>
                <span className="sr-only">, {kindLabel(entry.kind)},</span>{' '}
                <span className={styles.comingDate}>{dayRange(entry)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

/** What a day cell says to a screen reader: "২ কার্তিক, Monday 19 October. Today. Maha Ashtami, Durga Puja." */
function cellLabel(day: string, today: string, on: CalendarEntry[]): string {
  const bengali = toBengali(day)
  const parts = [
    `${bengaliDigits(bengali.day)} ${BENGALI_MONTHS[bengali.month].bengaliName}, ${formatCivil(day, { weekday: 'long', day: 'numeric', month: 'long' })}.`,
  ]
  if (day === today) parts.push('Today.')
  if (on.length > 0)
    parts.push(
      on
        .map((entry) => {
          const named = entry.days?.find((d) => d.date === day)
          return named ? `${named.name}, ${entry.name}` : entry.name
        })
        .join('; ') + '.',
    )
  return parts.join(' ')
}

/** On a phone a cell has room for two marks; the rest are counted. */
const CELL_MARKS = 2

/**
 * The drawings in a day's corner, for what begins on it: the start of a puja that runs over days,
 * not every day of it — the bar, or on a phone the dot, says it carries on. Two at most; on a
 * phone, one.
 */
function CellPictures({ entries }: { entries: CalendarEntry[] }) {
  if (entries.length === 0) return null
  return (
    <span className={styles.cellPictures} aria-hidden="true">
      {entries
        // One of each drawing: our evening for Mahalaya and Mahalaya itself share one.
        .filter((entry, i, all) => all.findIndex((other) => (other.icon ?? other.kind) === (entry.icon ?? entry.kind)) === i)
        .slice(0, 2)
        .map((entry) => (
          <span key={entry.key} className={styles.cellPicture} data-kind={entry.kind}>
            {entry.icon ? <RitualIcon id={entry.icon} /> : <KindMark kind={entry.kind} />}
          </span>
        ))}
    </span>
  )
}

function MonthGrid({ shown, today, entries, direction }: { shown: MonthRef; today: string; entries: CalendarEntry[]; direction: number }) {
  const view = monthView(shown)
  const inMonth = entriesBetween(entries, view.first, view.last)
  const lanes = laneOf(inMonth)
  const laneCount = Math.max(0, ...lanes.values()) + (inMonth.length > 0 ? 1 : 0)
  return (
    <div className={styles.gridWrap} data-direction={direction > 0 ? 'next' : direction < 0 ? 'previous' : undefined}>
      <table className={styles.grid}>
        <caption className="sr-only">
          {monthName(shown)} {shown.year}, {monthSpan(view.first, view.last)}
        </caption>
        <thead>
          <tr>
            {BENGALI_WEEKDAYS.map((name, i) => (
              <th key={name} scope="col" className={styles.weekday}>
                <span lang="bn" aria-hidden="true" className={styles.weekdayLong}>
                  {name}
                </span>
                <span lang="bn" aria-hidden="true" className={styles.weekdayShort}>
                  {SHORT_WEEKDAYS[i]}
                </span>
                <span className={styles.weekdayEnglish} aria-hidden="true">
                  {ENGLISH_WEEKDAYS[i].slice(0, 3)}
                </span>
                <span className="sr-only">{ENGLISH_WEEKDAYS[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.weeks.map((week, w) => (
            <tr key={w}>
              {week.map((day, d) => {
                if (day < view.first || day > view.last) {
                  // A day of the month either side: there to read, faded, and not this month's —
                  // so not a link, and left out for a screen reader, which has the caption.
                  const theirs = toBengali(day)
                  const gregorian = Number(day.slice(8))
                  return (
                    <td key={d} className={styles.outside}>
                      <span className={styles.dayPlain} aria-hidden="true">
                        <span className={styles.dayNumbers}>
                          <span lang="bn" className={styles.bengaliDay}>
                            {bengaliDigits(theirs.day)}
                            {theirs.day === 1 ? <span className={styles.outsideMonth}> {BENGALI_MONTHS[theirs.month].bengaliName}</span> : null}
                          </span>
                          <span className={styles.gregorianDay}>
                            {gregorian}
                            {gregorian === 1 ? <span className={styles.gregorianMonth}> {formatCivil(day, { month: 'short' })}</span> : null}
                          </span>
                        </span>
                      </span>
                    </td>
                  )
                }
                const on = entriesOn(inMonth, day)
                const bengali = toBengali(day)
                const gregorianDay = Number(day.slice(8))
                const showMonth = gregorianDay === 1 || day === view.first
                const content = (
                  <>
                    <span className={styles.dayNumbers} aria-hidden="true">
                      <span lang="bn" className={styles.bengaliDay}>
                        {bengaliDigits(bengali.day)}
                      </span>
                      <span className={styles.gregorianDay}>
                        {gregorianDay}
                        {showMonth ? <span className={styles.gregorianMonth}> {formatCivil(day, { month: 'short' })}</span> : null}
                      </span>
                    </span>
                    {laneCount > 0 ? (
                      <span className={styles.lanes} aria-hidden="true">
                        {Array.from({ length: laneCount }, (_, lane) => {
                          const entry = on.find((e) => lanes.get(e.key) === lane)
                          if (!entry) return <span key={lane} className={styles.laneEmpty} />
                          const starts = entry.start === day || day === view.first
                          const ends = entry.end === day || day === view.last
                          const label = starts || d === 0
                          return (
                            <span
                              key={lane}
                              className={styles.bar}
                              data-kind={entry.kind}
                              data-starts={starts || d === 0 ? 'true' : undefined}
                              data-ends={ends || d === 6 ? 'true' : undefined}
                              data-open-start={entry.start < view.first && day === view.first ? 'true' : undefined}
                              data-open-end={entry.end > view.last && day === view.last ? 'true' : undefined}
                              data-overflow={on.indexOf(entry) >= CELL_MARKS ? 'true' : undefined}
                            >
                              {label ? (
                                <>
                                  <KindMark kind={entry.kind} className={styles.barMark} />
                                  <span className={styles.barText}>{entry.name}</span>
                                </>
                              ) : null}
                            </span>
                          )
                        })}
                      </span>
                    ) : null}
                    {on.length > CELL_MARKS ? <span className={styles.more} aria-hidden="true">+{on.length - CELL_MARKS}</span> : null}
                    <CellPictures entries={on.filter((entry) => entry.start === day || (day === view.first && entry.start < view.first))} />
                  </>
                )
                return (
                  <td
                    key={d}
                    className={styles.day}
                    data-kind={on[0]?.kind}
                    data-today={day === today ? 'true' : undefined}
                    aria-current={day === today ? 'date' : undefined}
                    style={{ '--cell': w * 7 + d } as CSSProperties}
                  >
                    {on.length > 0 ? (
                      <a href={`#entry-${on[0].key}`} className={styles.dayLink} aria-label={cellLabel(day, today, on)}>
                        {content}
                      </a>
                    ) : (
                      <span className={styles.dayPlain}>
                        {content}
                        <span className="sr-only">{cellLabel(day, today, on)}</span>
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Agenda({
  shown,
  entries,
  covered,
  eveningsPending,
  eveningsFailed,
  onRetry,
}: {
  shown: MonthRef
  entries: CalendarEntry[]
  covered: boolean
  eveningsPending: boolean
  eveningsFailed: boolean
  onRetry: () => void
}) {
  const view = monthView(shown)
  const inMonth = entriesBetween(entries, view.first, view.last)
  const before = monthName(shiftMonth(shown, -1))
  const after = monthName(shiftMonth(shown, 1))
  return (
    <div className={styles.agenda}>
      <h3 className={styles.agendaTitle}>In {monthName(shown)}</h3>
      {!covered ? (
        <p className={styles.note}>
          The panjika for {shown.year} is not entered yet, so pujas and festivals will appear here once the committee has checked them. The
          dates of the days are right.
        </p>
      ) : null}
      {inMonth.length > 0 ? (
        <ul className={styles.agendaList}>
          {inMonth.map((entry) => (
            <li key={entry.key} id={`entry-${entry.key}`} className={styles.agendaItem} data-kind={entry.kind} tabIndex={-1}>
              <Picture entry={entry} className={styles.agendaPicture} />
              <div className={styles.agendaBody}>
                <h4 className={styles.agendaName}>
                  <EntryName entry={entry} />
                </h4>
                <p className={styles.agendaMeta}>
                  <KindMark kind={entry.kind} className={styles.mark} />{' '}
                  <span className={styles.kindWord}>{kindLabel(entry.kind)}</span> · {dayRange(entry)} ·{' '}
                  <span lang="bn">{formatBengaliDate(toBengali(entry.start))}</span>
                  {entry.start < view.first ? ` · continues from ${before}` : ''}
                  {entry.end > view.last ? ` · continues into ${after}` : ''}
                </p>
                {entry.description ? <p className={styles.agendaText}>{entry.description}</p> : null}
                <Times entry={entry} />
                {entry.days && entry.days.length > 0 ? (
                  <ul className={styles.dayNames}>
                    {entry.days.map((day) => (
                      <li key={day.date}>
                        <span className={styles.dayNameDate}>{formatCivil(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>{' '}
                        {day.bengaliName ? <span lang="bn">{day.bengaliName}</span> : null} {day.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {entry.href ? (
                  <Link to={entry.href} className={styles.agendaLink}>
                    See the evening
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : covered ? (
        <p className={styles.note}>
          Nothing marked in {monthName(shown)}. Our own evenings are on the <Link to="/events">Events page</Link>.
        </p>
      ) : null}
      {eveningsPending ? (
        <p className={styles.note} aria-busy="true">
          Fetching our own evenings…
        </p>
      ) : eveningsFailed ? (
        <LoadFailed what="our own evenings" onRetry={onRetry} />
      ) : null}
    </div>
  )
}

function YearAtAGlance({ year, current, shown, entries }: { year: number; current: MonthRef; shown: MonthRef; entries: CalendarEntry[] }) {
  const starts = monthStarts(year)
  return (
    <section className={styles.glance} aria-labelledby="glance-title">
      <h2 id="glance-title" className={styles.glanceTitle}>
        Year at a glance <span lang="bn">{bengaliDigits(year)}</span>
      </h2>
      <ol className={styles.glanceList}>
        {BENGALI_MONTHS.map((month, i) => {
          const ref = { year, month: i }
          const first = starts[i]
          const last = addCivilDays(first, monthLength(year, i) - 1)
          const names = entriesBetween(entries, first, last)
            .filter((entry) => entry.kind !== 'evening' && entry.start >= first)
            .map((entry) => entry.name)
          const isCurrent = compareMonths(ref, current) === 0
          const isShown = compareMonths(ref, shown) === 0
          const reachable = compareMonths(ref, FIRST_MONTH) >= 0 && compareMonths(ref, LAST_MONTH) <= 0
          return (
            <li key={month.name} className={styles.glanceItem} data-current={isCurrent ? 'true' : undefined}>
              <span className={styles.glanceMonth}>
                <span lang="bn" className={styles.entryBengali}>
                  {month.bengaliName}
                </span>{' '}
                {reachable ? (
                  <Link to={`/calendar?month=${monthParam(ref)}`} preventScrollReset aria-current={isShown ? 'true' : undefined}>
                    {month.name}
                  </Link>
                ) : (
                  month.name
                )}
              </span>
              <span className={styles.glanceSpan}>
                {formatCivil(first, { day: 'numeric', month: 'short' })} – {formatCivil(last, { day: 'numeric', month: 'short' })}
              </span>
              <span className={styles.glanceNames}>
                {isCurrent ? <span className={styles.thisMonth}>This month</span> : null}
                {names.join(', ')}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/**
 * The Bengali year: the pujas, festivals and cultural days by the West Bengal calendar, with
 * the community's own evenings among them.
 *
 * It opens on the Bengali month it is today, and the month shown is in the address, so one can
 * be sent to somebody and Back goes to the month before. The days are worked out from the sun
 * for any year; the rituals are only for the years the committee has entered and checked.
 */
export function CalendarPage() {
  useDocumentTitle('Calendar')
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const today = civilDate(useNow())
  const current = monthOf(today)
  const shown = clampMonth(readMonthParam(params.get('month')) ?? clampMonth(current))
  const shownKey = monthParam(shown)

  const upcoming = useUpcomingEvents(50)
  const past = usePastEvents(50)
  const eveningsPending = upcoming.isPending || past.isPending
  const eveningsFailed = upcoming.isError || past.isError

  const entries = useMemo(() => {
    const evenings = [...(upcoming.data ?? []), ...(past.data ?? [])]
      .map(eveningEntry)
      .filter((entry): entry is CalendarEntry => entry !== null)
    const unique = evenings.filter((entry, i) => evenings.findIndex((e) => e.key === entry.key) === i)
    return [...rituals.map(ritualEntry), ...unique]
  }, [upcoming.data, past.data])

  // Which way the last move went, so the new month slides in from that side.
  const [moved, setMoved] = useState({ key: shownKey, direction: 0 })
  if (moved.key !== shownKey) {
    const from = readMonthParam(moved.key)
    setMoved({ key: shownKey, direction: from ? Math.sign(compareMonths(shown, from)) : 0 })
  }

  // Moving to another month takes focus to its heading and says where it is; the first drawing
  // of the page does neither. The page stays where it was — the buttons stay under the finger —
  // unless the month is off the screen, as it is from the year at the foot, and then it comes up.
  const section = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [announced, setAnnounced] = useState('')
  const lastKey = useRef(shownKey)
  useEffect(() => {
    if (lastKey.current === shownKey) return
    lastKey.current = shownKey
    setAnnounced(`${monthName(shown)} ${shown.year}`)
    // Sent to one occasion in it — "Coming up" in another month — that is where to land; the
    // router has already scrolled to it, and moving to the month's top would undo that.
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (target) {
      target.focus({ preventScroll: true })
      return
    }
    heading.current?.focus({ preventScroll: true })
    const top = section.current?.getBoundingClientRect().top ?? 0
    if (top < 0 || top > window.innerHeight * 0.6) {
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      section.current?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' })
    }
  }, [shownKey, shown, hash])

  const view = monthView(shown)
  const previous = shiftMonth(shown, -1)
  const next = shiftMonth(shown, 1)
  const hasPrevious = compareMonths(previous, FIRST_MONTH) >= 0
  const hasNext = compareMonths(next, LAST_MONTH) <= 0
  const covered = RITUAL_YEARS.includes(shown.year)
  const isCurrent = compareMonths(shown, current) === 0

  return (
    <Container className={styles.page}>
      <header className={styles.head}>
        <p lang="bn" className={styles.kickerBn}>
          বারো মাসে তেরো পার্বণ
        </p>
        <h1 className={styles.title}>Calendar</h1>
        <p className={styles.intro}>Pujas, festivals and our own evenings through the Bengali year, with the English date beside every day.</p>
        <p className={styles.panjika}>
          Dates follow the Bisuddha Siddhanta panjika for Kolkata, as the West Bengal holiday list does. The Gupta Press almanac, and some UK
          temples, can be a day either side, and we often hold our own evening on the nearest weekend.
        </p>
      </header>

      <TodayPanel today={today} entries={entries} />

      <section ref={section} className={styles.month} aria-labelledby="month-title">
        <div className={styles.monthHead}>
          <nav className={styles.monthNav} aria-label="Months">
            {hasPrevious ? (
              <Link
                to={`/calendar?month=${monthParam(previous)}`}
                preventScrollReset
                className={styles.step}
                data-step="previous"
                aria-label={`Previous month, ${monthName(previous)}`}>
                <span className={styles.stepArrow}>‹</span>
                <span className={styles.stepNames}>
                  <span lang="bn" className={styles.stepBengali}>
                    {bengaliMonthName(previous)}
                  </span>
                  <span className={styles.stepEnglish}>{monthName(previous)}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {hasNext ? (
              <Link
                to={`/calendar?month=${monthParam(next)}`}
                preventScrollReset
                className={styles.step}
                data-step="next"
                aria-label={`Next month, ${monthName(next)}`}>
                <span className={`${styles.stepNames} ${styles.stepNamesEnd}`}>
                  <span lang="bn" className={styles.stepBengali}>
                    {bengaliMonthName(next)}
                  </span>
                  <span className={styles.stepEnglish}>{monthName(next)}</span>
                </span>
                <span className={styles.stepArrow}>›</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
          <h2 id="month-title" ref={heading} tabIndex={-1} className={styles.monthTitle}>
            <span lang="bn" className={styles.monthBengali}>
              {bengaliMonthName(shown)} {bengaliDigits(shown.year)}
            </span>{' '}
            <span className={styles.monthEnglish}>
              {monthName(shown)} {shown.year}
            </span>
          </h2>
          <p className={styles.monthSpan}>
            {monthSpan(view.first, view.last)} · {view.length} days
            {!isCurrent ? (
              <>
                {' · '}
                <Link to={`/calendar?month=${monthParam(clampMonth(current))}`} preventScrollReset>
                  Back to this month
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <MonthGrid key={shownKey} shown={shown} today={today} entries={entries} direction={moved.direction} />
        <Agenda
          shown={shown}
          entries={entries}
          covered={covered}
          eveningsPending={eveningsPending}
          eveningsFailed={eveningsFailed}
          onRetry={() => {
            void upcoming.refetch()
            void past.refetch()
          }}
        />
        <p className="sr-only" aria-live="polite">
          {announced}
        </p>
      </section>

      <YearAtAGlance year={shown.year} current={current} shown={shown} entries={entries} />
    </Container>
  )
}
