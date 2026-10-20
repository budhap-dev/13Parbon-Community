import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { calendarShareLine } from '@/app/shareLines'
import { RITUAL_YEARS, rituals } from '@/app/bengaliYear'
import { Container } from '@/components/Container'
import { LoadFailed } from '@/components/LoadFailed'
import {
  BANGABDA_OFFSET,
  BENGALI_MONTHS,
  BENGALI_WEEKDAYS,
  PANJIKAS,
  bengaliDigits,
  civilDate,
  formatBengaliDate,
  formatCivil,
  monthCertainty,
  monthLength,
  monthStarts,
  toBengali,
  addCivilDays,
  type Panjika,
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
import { readPanjika, savePanjika } from './panjikaChoice'
import styles from './Calendar.module.css'

const ENGLISH_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** For a phone's narrow columns, where বৃহস্পতি runs into Friday: Thursday as almanacs shorten it. */
const SHORT_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']

/**
 * How many years either side of this one the page will go to. It rolls on by itself each Poila
 * Boishakh; a year in it that has not been entered still has its days, and says so.
 */
const YEARS_EITHER_SIDE = 2

/** The months the page will go to: Boishakh two years back to Choitro two years on. */
type MonthRange = { first: MonthRef; last: MonthRef }

const rangeAround = (currentYear: number): MonthRange => ({
  first: { year: currentYear - YEARS_EITHER_SIDE, month: 0 },
  last: { year: currentYear + YEARS_EITHER_SIDE, month: 11 },
})

const clampMonth = (ref: MonthRef, { first, last }: MonthRange) =>
  compareMonths(ref, first) < 0 ? first : compareMonths(ref, last) > 0 ? last : ref

const inRange = (ref: MonthRef, { first, last }: MonthRange) => compareMonths(ref, first) >= 0 && compareMonths(ref, last) <= 0

/** "2026–27": the English years a Bengali one runs over, from mid-April to mid-April. */
const englishYears = (year: number) => {
  const start = year + BANGABDA_OFFSET
  return `${start}–${String(start + 1).slice(-2)}`
}

const monthName = ({ month }: MonthRef) => BENGALI_MONTHS[month].name
const bengaliMonthName = ({ month }: MonthRef) => BENGALI_MONTHS[month].bengaliName

/** "Jagaddhatri Puja and Rash Purnima" */
const listOf = (names: string[]) => new Intl.ListFormat('en-GB', { type: 'conjunction' }).format(names)

/**
 * By Benimadhab Sil, the pujas not yet read from the almanac, by their Bisuddha dates, from one day
 * to another: they are left out of the page, and a note says so wherever they would have been.
 */
const notEnteredBetween = (panjika: Panjika, from: string, to: string) =>
  rituals.filter((ritual) => ritual.date >= from && ritual.date <= to && ritualEntry(ritual, panjika) === null).map((ritual) => ritual.name)

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

const monthOf = (iso: string, panjika: Panjika): MonthRef => {
  const { year, month } = toBengali(iso, panjika)
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

/** "Fri 16 Oct, 11:15 pm –" and "Sun 18 Oct, 1:22 am", each kept whole, so a line breaks only after the dash. */
function Span({ text }: { text: string }) {
  const [from, to] = text.split(' – ')
  // One element around both halves: in the flex row beside "UK", two would be two items that never wrap.
  return (
    <span>
      <span className={styles.nowrap}>{to ? `${from} –` : from}</span>
      {to ? (
        <>
          {' '}
          <span className={styles.nowrap}>{to}</span>
        </>
      ) : null}
    </span>
  )
}

/**
 * When it begins and ends, in UK time and India's, a line and a colour each so the two clocks are
 * not read as one. The tithi is one moment the world over; it is only the clock that differs.
 */
function Times({ entry, on }: { entry: CalendarEntry; on?: string }) {
  const times = (entry.times ?? []).filter((time) => !on || touchesDay(time, on))
  if (times.length === 0) return null
  const evening = entry.kind === 'evening'
  return (
    <dl className={styles.times}>
      {times.map((time) => (
        <div key={`${time.label}-${time.from}`} className={styles.time}>
          {/* A tithi is the window; anything else — Sandhi Puja, a muhurat, a sankranti — is the moment itself. */}
          <dt className={styles.timeLabel} data-span={/tithi/i.test(time.label) ? 'tithi' : 'moment'}>
            {time.label}
          </dt>
          {evening ? (
            <dd>
              <Span text={formatSpan(time, 'uk')} />
            </dd>
          ) : (
            <dd className={styles.zones}>
              <span className={styles.zone} data-zone="uk">
                <span className={styles.zoneName}>UK</span> <Span text={formatSpan(time, 'uk')} />
              </span>
              <span className={styles.zone} data-zone="india">
                <span className={styles.zoneName}>India</span> <Span text={formatSpan(time, 'kolkata')} />
              </span>
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}

/** Where an entry in "coming up" goes: an evening to its page, the rest to their month. */
function entryHref(entry: CalendarEntry, panjika: Panjika): string {
  return entry.href ?? `/calendar?month=${monthParam(monthOf(entry.start, panjika))}#entry-${entry.key}`
}

function TodayPanel({ today, entries, panjika }: { today: string; entries: CalendarEntry[]; panjika: Panjika }) {
  const now = entriesOn(entries, today)
  const next = comingUp(entries, today)
  // What Benimadhab Sil leaves out of the same stretch, so it is not missing without a word.
  const horizon = next.length === 3 ? next[2].start : addCivilDays(today, 30)
  const missing = notEnteredBetween(panjika, addCivilDays(today, 1), horizon)
  return (
    <section className={styles.today} aria-labelledby="today-title">
      <h2 id="today-title" className={styles.todayTitle}>
        Today
      </h2>
      <p className={styles.todayDate}>
        <span lang="bn">আজ {formatBengaliDate(toBengali(today, panjika))}</span>
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
                <div className={styles.todayBody}>
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
                <Link to={entryHref(entry, panjika)}>{entry.name}</Link>
                <span className="sr-only">, {kindLabel(entry.kind)},</span>{' '}
                <span className={styles.comingDate}>{dayRange(entry)}</span>
              </li>
            ))}
          </ul>
          {missing.length > 0 ? (
            <p className={styles.comingMissing}>
              {listOf(missing)} {missing.length > 1 ? 'are' : 'is'} not in Benimadhab Sil dates yet.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

/** What a day cell says to a screen reader: "২ কার্তিক, Monday 19 October. Today. Maha Ashtami, Durga Puja." */
function cellLabel(day: string, today: string, on: CalendarEntry[], panjika: Panjika): string {
  const bengali = toBengali(day, panjika)
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

function MonthGrid({
  shown,
  today,
  entries,
  direction,
  panjika,
}: {
  shown: MonthRef
  today: string
  entries: CalendarEntry[]
  direction: number
  panjika: Panjika
}) {
  const view = monthView(shown, panjika)
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
                  const theirs = toBengali(day, panjika)
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
                const bengali = toBengali(day, panjika)
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
                      <a href={`#entry-${on[0].key}`} className={styles.dayLink} aria-label={cellLabel(day, today, on, panjika)}>
                        {content}
                      </a>
                    ) : (
                      <span className={styles.dayPlain}>
                        {content}
                        <span className="sr-only">{cellLabel(day, today, on, panjika)}</span>
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
  panjika,
}: {
  shown: MonthRef
  entries: CalendarEntry[]
  covered: boolean
  eveningsPending: boolean
  eveningsFailed: boolean
  onRetry: () => void
  panjika: Panjika
}) {
  const view = monthView(shown, panjika)
  const inMonth = entriesBetween(entries, view.first, view.last)
  const certainty = monthCertainty(shown.year, shown.month, panjika)
  const notEntered = covered ? notEnteredBetween(panjika, view.first, view.last) : []
  const before = monthName(shiftMonth(shown, -1))
  const after = monthName(shiftMonth(shown, 1))
  return (
    <div className={styles.agenda}>
      <h3 className={styles.agendaTitle}>In {monthName(shown)}</h3>
      {!covered ? (
        <p className={styles.note}>
          The panjika for {shown.year} is not entered yet, so pujas and festivals will appear here once the committee has checked them.
          {certainty === 'printed' ? ' The dates of the days are right.' : null}
        </p>
      ) : null}
      {certainty !== 'printed' ? (
        <p className={styles.note}>
          We have worked out {monthName(shown)} {shown.year} by the Benimadhab Sil almanac’s own rules, but not yet checked it against a printed
          copy.
          {certainty === 'close'
            ? ' It starts or ends close to midnight, so the printed almanac may put that day one day earlier or later.'
            : null}
        </p>
      ) : null}
      {notEntered.length > 0 ? (
        <p className={styles.note}>
          Not here yet in Benimadhab Sil dates: {listOf(notEntered)}. We have not read {notEntered.length > 1 ? 'their dates' : 'its date'} from
          the almanac yet, and would rather leave {notEntered.length > 1 ? 'them' : 'it'} out than show the wrong day. Choose Bisuddha
          Siddhanta above to see {notEntered.length > 1 ? 'them' : 'it'}.
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
                  <span lang="bn" className={styles.nowrap}>
                    {formatBengaliDate(toBengali(entry.start, panjika))}
                  </span>
                  {/* The space outside each piece, so a line can break before it. */}
                  {entry.start < view.first ? (
                    <>
                      {' '}
                      <span className={styles.nowrap}>· continues from {before}</span>
                    </>
                  ) : null}
                  {entry.end > view.last ? (
                    <>
                      {' '}
                      <span className={styles.nowrap}>· continues into {after}</span>
                    </>
                  ) : null}
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

/**
 * Which Bengali year: a plain select between the month arrows, so a phone gives its own wheel.
 * Another year opens on the same month in it, so Durga Puja next year is one choice away.
 */
function YearPicker({ shown, range, onPick }: { shown: MonthRef; range: MonthRange; onPick: () => void }) {
  const navigate = useNavigate()
  const years: number[] = []
  for (let year = range.first.year; year <= range.last.year; year += 1) years.push(year)
  return (
    <label className={styles.yearPicker}>
      <span className="sr-only">Bengali year</span>
      <select
        className={styles.yearSelect}
        value={shown.year}
        onChange={(event) => {
          onPick()
          navigate(`/calendar?month=${monthParam({ year: Number(event.target.value), month: shown.month })}`, { preventScrollReset: true })
        }}>
        {years.map((year) => (
          <option key={year} value={year}>
            {`${bengaliDigits(year)} · ${englishYears(year)}${RITUAL_YEARS.includes(year) ? '' : ' (days only)'}`}
          </option>
        ))}
      </select>
    </label>
  )
}

function YearAtAGlance({
  year,
  current,
  shown,
  entries,
  panjika,
  range,
}: {
  year: number
  current: MonthRef
  shown: MonthRef
  entries: CalendarEntry[]
  panjika: Panjika
  range: MonthRange
}) {
  const starts = monthStarts(year, panjika)
  return (
    <section className={styles.glance} aria-labelledby="glance-title">
      <h2 id="glance-title" className={styles.glanceTitle}>
        Year at a glance <span lang="bn">{bengaliDigits(year)}</span>
      </h2>
      <ol className={styles.glanceList}>
        {BENGALI_MONTHS.map((month, i) => {
          const ref = { year, month: i }
          const first = starts[i]
          const last = addCivilDays(first, monthLength(year, i, panjika) - 1)
          const names = entriesBetween(entries, first, last)
            .filter((entry) => entry.kind !== 'evening' && entry.start >= first)
            .map((entry) => entry.name)
          const isCurrent = compareMonths(ref, current) === 0
          const isShown = compareMonths(ref, shown) === 0
          const reachable = inRange(ref, range)
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

/** What is on in a month, by name, once each and leaving out our own evenings: for its share line. */
function occasionsIn(shown: MonthRef, entries: CalendarEntry[], panjika: Panjika): string[] {
  const view = monthView(shown, panjika)
  return entriesBetween(entries, view.first, view.last)
    .filter((entry) => entry.kind !== 'evening')
    .map((entry) => entry.name)
    .filter((name, i, all) => all.indexOf(name) === i)
}

/**
 * Which panjika the days are counted by. A pair of radios, so the arrow keys move between them as
 * they would in any form, with one accent pill that slides to the chosen half — tapped, or
 * dragged across with a finger and let go nearer the other half.
 *
 * The halves are not the same width, so both are measured and the pill is drawn between them,
 * again when the fonts arrive or the page reflows. Until they have been measured — and where
 * nothing can be, as in tests — the chosen half fills itself and there is nothing to drag.
 */
function PanjikaSwitch({ panjika, onChange }: { panjika: Panjika; onChange: (panjika: Panjika) => void }) {
  const options = useRef<HTMLDivElement>(null)
  const [halves, setHalves] = useState<{ x: number; width: number }[] | null>(null)
  // While dragging, how far across the pill is: 0 on the first half, 1 on the second.
  const [dragged, setDragged] = useState<number | null>(null)
  const gesture = useRef<{ pointer: number; startX: number; from: number; at: number; moving: boolean } | null>(null)
  // A drag ends with a click on whichever half the finger was over; that is not a choice.
  const ignoreClicksUntil = useRef(0)
  const chosen = PANJIKAS.findIndex((option) => option.id === panjika)

  useLayoutEffect(() => {
    const box = options.current
    if (!box) return
    const measure = () => {
      const inside = box.getBoundingClientRect().left + box.clientLeft
      const rects = [...box.querySelectorAll('label')].map((label) => label.getBoundingClientRect())
      if (rects.length === 2 && rects.every((rect) => rect.width > 0)) setHalves(rects.map((rect) => ({ x: rect.left - inside, width: rect.width })))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    for (const label of box.querySelectorAll('label')) observer.observe(label)
    return () => observer.disconnect()
  }, [])

  const at = dragged ?? chosen
  const thumb = halves && {
    x: halves[0].x + at * (halves[1].x - halves[0].x),
    width: halves[0].width + at * (halves[1].width - halves[0].width),
  }
  const lit = dragged === null ? chosen : Math.round(dragged)

  return (
    <fieldset className={styles.choice}>
      <legend className={styles.choiceLegend}>Panjika</legend>
      <div
        ref={options}
        className={styles.choiceOptions}
        data-measured={thumb ? 'true' : undefined}
        data-dragging={dragged === null ? undefined : 'true'}
        onPointerDown={(event) => {
          if (!halves || event.button !== 0) return
          gesture.current = { pointer: event.pointerId, startX: event.clientX, from: chosen, at: chosen, moving: false }
        }}
        onPointerMove={(event) => {
          const drag = gesture.current
          if (!drag || drag.pointer !== event.pointerId || !halves) return
          const moved = event.clientX - drag.startX
          // A few pixels of wobble is still a tap.
          if (!drag.moving && Math.abs(moved) < 6) return
          if (!drag.moving) {
            drag.moving = true
            event.currentTarget.setPointerCapture?.(event.pointerId)
          }
          drag.at = Math.min(1, Math.max(0, drag.from + moved / (halves[1].x - halves[0].x)))
          setDragged(drag.at)
        }}
        onPointerUp={(event) => {
          const drag = gesture.current
          gesture.current = null
          if (!drag || drag.pointer !== event.pointerId || !drag.moving) return
          ignoreClicksUntil.current = event.timeStamp + 400
          setDragged(null)
          const landed = PANJIKAS[Math.round(drag.at)].id
          if (landed !== panjika) onChange(landed)
          options.current?.querySelector<HTMLInputElement>(`input[value="${landed}"]`)?.focus({ preventScroll: true })
        }}
        onPointerCancel={() => {
          gesture.current = null
          setDragged(null)
        }}
        onClickCapture={(event) => {
          if (event.timeStamp < ignoreClicksUntil.current) event.preventDefault()
        }}
      >
        {thumb ? (
          <span
            className={styles.choiceThumb}
            aria-hidden="true"
            style={{ '--thumb-x': `${thumb.x}px`, '--thumb-width': `${thumb.width}px` } as CSSProperties}
          />
        ) : null}
        {PANJIKAS.map((option, i) => (
          <label key={option.id} className={styles.choiceOption} data-lit={thumb && i === lit ? 'true' : undefined}>
            <input
              type="radio"
              name="panjika"
              value={option.id}
              checked={panjika === option.id}
              onChange={() => onChange(option.id)}
              className={styles.choiceInput}
            />
            <span lang="bn" className={styles.choiceBengali}>
              {option.bengaliName}
            </span>{' '}
            <span>{option.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** What the dates follow, under the switch: it changes with it. */
function PanjikaNote({ panjika }: { panjika: Panjika }) {
  if (panjika === 'surya')
    return (
      <p className={styles.panjika}>
        Dates follow the Surya Siddhanta panjika printed by Benimadhab Sil, which Gupta Press agrees with to a minute or two. The West
        Bengal holiday list follows the Bisuddha Siddhanta, where about a third of the months start a day earlier and some pujas fall a
        day either side: choose it above to see its dates. A few pujas are not in yet; each month says which. We often hold our own
        evening on the nearest weekend.
      </p>
    )
  return (
    <p className={styles.panjika}>
      Dates follow the Bisuddha Siddhanta panjika for Kolkata, as the West Bengal holiday list does. The Benimadhab Sil and Gupta Press
      almanacs, which many families and some UK temples follow, can be a day either side: choose Benimadhab Sil above to see their dates.
      We often hold our own evening on the nearest weekend.
    </p>
  )
}

/**
 * The Bengali year: the pujas, festivals and cultural days by the West Bengal calendar, with
 * the community's own evenings among them. It opens on the Benimadhab Sil panjika, the Surya
 * Siddhanta; the reader can switch to the Bisuddha Siddhanta, and the page remembers it in
 * their browser; see docs/CALENDAR.md.
 *
 * It opens on the Bengali month it is today, and the month shown is in the address, so one can
 * be sent to somebody and Back goes to the month before. The days are worked out from the sun
 * for any year; the rituals are only for the years the committee has entered and checked.
 */
export function CalendarPage() {
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const today = civilDate(useNow())
  const [panjika, setPanjika] = useState<Panjika>(readPanjika)
  const choose = (next: Panjika) => {
    setPanjika(next)
    savePanjika(next)
  }
  const current = monthOf(today, panjika)
  const range = rangeAround(current.year)
  const shown = clampMonth(readMonthParam(params.get('month')) ?? current, range)
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
    const shown = rituals.map((ritual) => ritualEntry(ritual, panjika)).filter((entry): entry is CalendarEntry => entry !== null)
    return [...shown, ...unique]
  }, [upcoming.data, past.data, panjika])

  useDocumentTitle('Calendar', calendarShareLine(`${monthName(shown)} ${shown.year}`, occasionsIn(shown, entries, panjika)))

  // Which way the last move went, so the new month slides in from that side.
  // Switching panjika can change the month too, on the days the two disagree on it; that is not
  // a move, so the grid redraws where it is rather than sliding in from a side.
  const [moved, setMoved] = useState({ key: shownKey, panjika, direction: 0 })
  if (moved.key !== shownKey || moved.panjika !== panjika) {
    const from = readMonthParam(moved.key)
    const direction = moved.panjika === panjika && from ? Math.sign(compareMonths(shown, from)) : 0
    setMoved({ key: shownKey, panjika, direction })
  }

  // Moving to another month takes focus to its heading and says where it is; the first drawing
  // of the page does neither. The page stays where it was — the buttons stay under the finger —
  // unless the month is off the screen, as it is from the year at the foot, and then it comes up.
  const section = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [announced, setAnnounced] = useState('')
  const lastKey = useRef(shownKey)
  const lastPanjika = useRef(panjika)
  // A year picked from the list keeps focus on the list: arrowing through a closed select picks
  // as it goes, and focus leaving after the first step would take the rest of the years with it.
  const picked = useRef(false)
  useEffect(() => {
    const switched = lastPanjika.current !== panjika
    lastPanjika.current = panjika
    const fromPicker = picked.current
    picked.current = false
    if (lastKey.current === shownKey) return
    lastKey.current = shownKey
    // Nor does focus leave the switch for the month's heading when the month changed with it.
    if (switched) return
    setAnnounced(`${monthName(shown)} ${shown.year}`)
    if (fromPicker) return
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
  }, [shownKey, shown, hash, panjika])

  const view = monthView(shown, panjika)
  const previous = shiftMonth(shown, -1)
  const next = shiftMonth(shown, 1)
  const hasPrevious = inRange(previous, range)
  const hasNext = inRange(next, range)
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
        <PanjikaSwitch panjika={panjika} onChange={choose} />
        <PanjikaNote panjika={panjika} />
      </header>

      <TodayPanel today={today} entries={entries} panjika={panjika} />

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
            <YearPicker shown={shown} range={range} onPick={() => (picked.current = true)} />
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
                <Link to={`/calendar?month=${monthParam(current)}`} preventScrollReset>
                  Back to this month
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <MonthGrid key={`${shownKey}-${panjika}`} shown={shown} today={today} entries={entries} direction={moved.direction} panjika={panjika} />
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
          panjika={panjika}
        />
        <p className="sr-only" aria-live="polite">
          {announced}
        </p>
      </section>

      <YearAtAGlance year={shown.year} current={current} shown={shown} entries={entries} panjika={panjika} range={range} />
    </Container>
  )
}
