import { useEffect, useRef, useState } from 'react'
import { publicNav } from '@/app/nav'
import { useSettings, useSettingsFailed, useSettingsLoaded } from '@/app/SettingsContext'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { ActionBar } from '@/components/ActionBar'
import { Button } from '@/components/Button'
import { ConfirmButton, UNTIL_SAVED } from '@/components/ConfirmButton'
import { LoadFailed } from '@/components/LoadFailed'
import { NewsflashPreview } from '@/components/NewsflashRibbon'
import { formatDayLongMonth, formatLongDate, formatTime, forDateTimeInput, fromDateTimeInput } from '@/domain/dates'
import {
  blankNewsflash,
  NEWSFLASH_ANIMATION_LABELS,
  NEWSFLASH_ANIMATIONS,
  NEWSFLASH_BUTTON_MAX,
  NEWSFLASH_COLOUR_LABELS,
  NEWSFLASH_COLOURS,
  NEWSFLASH_HEADLINE_MAX,
  NEWSFLASH_LINE_MAX,
  NEWSFLASH_MAX_AT_ONCE,
  NEWSFLASH_TAG_MAX,
  newsflashProblems,
  newsflashState,
  tidyNewsflashes,
  tooManyAt,
  type Newsflash,
  type NewsflashAnimation,
} from '@/domain/newsflash'
import type { SiteSettings } from '@/domain/settings'
import { useSaveSettings } from '@/lib/api'
import { useNow } from '@/lib/clock'
import styles from '@/features/portal/Portal.module.css'
import forms from './ContentForms.module.css'

const STATE_LABELS = { up: 'Up now', waiting: 'Not up yet', over: 'Over' } as const

/**
 * The newsflashes: the ribbon under the header on the public site, for a new feature, a night
 * the site is down, a change of venue. Each has its own days, and up to three can be up at once.
 *
 * Kept in the site's settings like the sponsors, so it waits for what is saved before it opens:
 * a form opened on the code's empty list would offer to save that over the committee's.
 */
export function AdminNewsflashPage() {
  useDocumentTitle('Newsflash')
  const settings = useSettings()
  const loaded = useSettingsLoaded()
  const read = useSettingsFailed()

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Newsflash</h1>
          <p className={styles.sub}>A ribbon at the top of every page of the website, for as long as you say.</p>
        </div>
      </div>
      {loaded ? (
        <NewsflashForm settings={settings} />
      ) : read.failed ? (
        <LoadFailed what="the newsflashes" onRetry={read.retry} />
      ) : (
        <p className={styles.muted} role="status" aria-busy="true">
          Reading what is saved…
        </p>
      )}
    </div>
  )
}

function NewsflashForm({ settings }: { settings: SiteSettings }) {
  const save = useSaveSettings()
  const now = useNow()
  const [draft, setDraft] = useState<Newsflash[]>(() => settings.newsflashes.map((row) => ({ ...row })))
  /** The one card that is open. A list of six open cards is a long scroll to find the seventh. */
  const [open, setOpen] = useState<number | null>(() => (settings.newsflashes.length === 1 ? 0 : null))
  /** A card just added, to be brought into view and typed into once it has been drawn. */
  const added = useRef<number | null>(null)

  useEffect(() => {
    const card = added.current
    if (card === null) return
    added.current = null
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`newsflash-card-${card}`)?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' })
    document.getElementById(`newsflash-tag-${card}`)?.focus({ preventScroll: true })
  })

  const tidy = tidyNewsflashes(draft)
  const unsaved = JSON.stringify(tidy) !== JSON.stringify(settings.newsflashes)
  const unfinished = draft.some((row) => newsflashProblems(row).length > 0)
  const crowded = tooManyAt(tidy)
  const blocked = unfinished || crowded !== null
  // Every page the public can reach from the header, whatever is switched on today.
  const pages = publicNav({ ...settings, showPhotos: true, showNews: true, showCalendar: true, showSponsors: true, showQuizzes: true, showFeedback: true })
  const set = (i: number, changes: Partial<Newsflash>) =>
    setDraft((rows) => rows.map((row, j) => (i === j ? { ...row, ...changes } : row)))

  const status = save.isError ? (
    <span className={forms.error} role="alert">
      {save.error.message}
    </span>
  ) : crowded ? (
    <span className={forms.error} role="alert">
      More than {NEWSFLASH_MAX_AT_ONCE} would be up at once from {formatLongDate(crowded)}, {formatTime(crowded)}. Move one’s days, or take one down.
    </span>
  ) : unfinished ? (
    <span className={forms.error}>Finish the newsflashes marked below, then save.</span>
  ) : save.isSuccess && !unsaved ? (
    <span className={forms.hint} role="status">
      Saved. The site changes for everybody straight away.
    </span>
  ) : !unsaved && !save.isPending ? (
    <span className={forms.hint}>All saved</span>
  ) : null

  return (
    <form
      className={styles.panel}
      aria-labelledby="newsflash-list-title"
      onSubmit={(e) => {
        e.preventDefault()
        if (blocked) return
        save.mutate({ ...settings, newsflashes: tidy })
      }}
    >
      <div className={styles.panelHead}>
        <h2 id="newsflash-list-title" className={styles.panelTitle}>
          The newsflashes
        </h2>
        <span className={styles.muted}>
          {tidy.filter((row) => newsflashState(row, now) === 'up').length} up now
          {unsaved ? ' · unsaved' : ''}
        </span>
      </div>
      <div className={`${styles.pad} ${forms.form}`}>
        <ActionBar sticky status={status}>
          <Button
            variant="green"
            size="sm"
            onClick={() => {
              setDraft((rows) => [...rows, blankNewsflash(now)])
              setOpen(draft.length)
              added.current = draft.length
            }}
          >
            Add a newsflash
          </Button>
          <Button variant={unsaved || save.isPending ? 'gold' : 'line'} type="submit" size="sm" disabled={save.isPending || !unsaved || blocked}>
            {save.isPending ? 'Saving…' : 'Save the newsflashes'}
          </Button>
        </ActionBar>
        <p className={forms.hint}>
          Up to {NEWSFLASH_MAX_AT_ONCE} can be up at the same time; visitors move between them with arrows. Any marked
          “Show this one first” lead, then the earliest to go up. Somebody who closes one does not see it again.
        </p>
        {draft.length === 0 ? <p className={forms.hint}>No newsflashes yet. Add the first.</p> : null}
        <datalist id="newsflash-pages">
          <option value="/">Home</option>
          {pages.map((page) => (
            <option key={page.to} value={page.to}>
              {page.label}
            </option>
          ))}
        </datalist>
        {draft.map((row, i) => (
          <NewsflashCard
            key={i}
            row={row}
            index={i}
            now={now}
            open={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
            onChange={(changes) => set(i, changes)}
            onRemove={() => {
              setDraft((rows) => rows.filter((_, j) => j !== i))
              setOpen(null)
            }}
          />
        ))}
      </div>
    </form>
  )
}

function NewsflashCard({
  row,
  index,
  now,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  row: Newsflash
  index: number
  now: Date
  open: boolean
  onToggle: () => void
  onChange: (changes: Partial<Newsflash>) => void
  onRemove: () => void
}) {
  const id = (field: string) => `newsflash-${field}-${index}`
  const what = row.headline.trim() || row.headlineBn.trim() || `newsflash ${index + 1}`
  const problems = newsflashProblems(row)
  const state = problems.length === 0 ? STATE_LABELS[newsflashState(row, now)] : 'Not finished'
  const days =
    problems.length === 0 ? ` · ${formatDayLongMonth(row.from)} to ${formatDayLongMonth(row.until)}` : ''

  return (
    // Held clear of the sticky Add and Save bar when it is scrolled to.
    <div id={`newsflash-card-${index}`} className={forms.section} style={{ scrollMarginTop: 96 }}>
      <button
        type="button"
        className={forms.sectionHead}
        aria-expanded={open}
        aria-controls={id('body')}
        onClick={onToggle}
      >
        <span className={forms.sectionName}>{row.headline.trim() || row.headlineBn.trim() || `Newsflash ${index + 1}`}</span>
        <span className={forms.sectionNote}>
          <span className={problems.length > 0 ? forms.error : undefined}>{state}</span>
          {days}
        </span>
        <span aria-hidden="true" className={open ? forms.chevronOpen : forms.chevron}>
          ⌄
        </span>
      </button>

      <div id={id('body')} className={open ? forms.bodyOpen : forms.body}>
        <div className={forms.bodyInner}>
          <div className={forms.form}>
            <NewsflashPreview flash={row} />

            <div className={forms.row}>
              <div className={forms.field}>
                <label className={forms.label} htmlFor={id('tag')}>
                  What kind, in English
                </label>
                <input
                  id={id('tag')}
                  className={forms.input}
                  value={row.tag}
                  maxLength={NEWSFLASH_TAG_MAX}
                  placeholder="New feature, Important, Maintenance…"
                  onChange={(e) => onChange({ tag: e.target.value })}
                />
              </div>
              <div className={forms.field}>
                <label className={forms.label} htmlFor={id('tag-bn')}>
                  In Bengali, if you like
                </label>
                <input
                  id={id('tag-bn')}
                  lang="bn"
                  className={forms.input}
                  value={row.tagBn}
                  maxLength={NEWSFLASH_TAG_MAX}
                  placeholder="নতুন, জরুরি, রক্ষণাবেক্ষণ…"
                  onChange={(e) => onChange({ tagBn: e.target.value })}
                />
              </div>
            </div>
            <p className={forms.hint}>The little tag at the start of the ribbon. Leave the Bengali empty and it is in English only.</p>

            <div className={forms.row}>
              <div className={forms.field}>
                <label className={forms.label} htmlFor={id('headline-bn')}>
                  Headline in Bengali
                </label>
                <input
                  id={id('headline-bn')}
                  lang="bn"
                  className={forms.input}
                  value={row.headlineBn}
                  maxLength={NEWSFLASH_HEADLINE_MAX}
                  placeholder="বাংলা ক্যালেন্ডার এসে গেছে!"
                  onChange={(e) => onChange({ headlineBn: e.target.value })}
                />
              </div>
              <div className={forms.field}>
                <label className={forms.label} htmlFor={id('headline')}>
                  Headline in English
                </label>
                <input
                  id={id('headline')}
                  className={forms.input}
                  value={row.headline}
                  maxLength={NEWSFLASH_HEADLINE_MAX}
                  placeholder="The Bengali calendar is here"
                  onChange={(e) => onChange({ headline: e.target.value })}
                />
              </div>
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={id('line')}>
                One line about it
              </label>
              <textarea
                id={id('line')}
                className={forms.textarea}
                rows={2}
                value={row.line}
                maxLength={NEWSFLASH_LINE_MAX}
                aria-describedby={id('line-note')}
                onChange={(e) => onChange({ line: e.target.value })}
              />
              <p id={id('line-note')} className={forms.hint}>
                After the headline. Can be empty.{' '}
                <span className={forms.counter}>
                  {row.line.length} of {NEWSFLASH_LINE_MAX}
                </span>
              </p>
            </div>

            <div className={forms.row}>
              <div className={forms.field}>
                <label className={forms.label} htmlFor={id('to')}>
                  Takes people to
                </label>
                <input
                  id={id('to')}
                  className={forms.input}
                  list="newsflash-pages"
                  value={row.to}
                  placeholder="/calendar"
                  aria-describedby={id('to-note')}
                  onChange={(e) => onChange({ to: e.target.value })}
                />
                <p id={id('to-note')} className={forms.hint}>
                  A page on this site. Empty is a newsflash with no button.
                </p>
              </div>
              <div className={forms.field}>
                <label className={forms.label} htmlFor={id('button')}>
                  The button says
                </label>
                <input
                  id={id('button')}
                  className={forms.input}
                  value={row.button}
                  maxLength={NEWSFLASH_BUTTON_MAX}
                  placeholder="Take a look"
                  disabled={!row.to.trim()}
                  onChange={(e) => onChange({ button: e.target.value })}
                />
              </div>
            </div>

            <div className={forms.row}>
              <div className={forms.field}>
                <label className={forms.label} htmlFor={id('from')}>
                  Goes up
                </label>
                <input
                  id={id('from')}
                  type="datetime-local"
                  className={forms.input}
                  value={forDateTimeInput(row.from)}
                  onChange={(e) => onChange({ from: fromDateTimeInput(e.target.value) })}
                />
              </div>
              <div className={forms.field}>
                <label className={forms.label} htmlFor={id('until')}>
                  Comes down
                </label>
                <input
                  id={id('until')}
                  type="datetime-local"
                  className={forms.input}
                  value={forDateTimeInput(row.until)}
                  onChange={(e) => onChange({ until: fromDateTimeInput(e.target.value) })}
                />
              </div>
            </div>

            <fieldset className={forms.fieldset}>
              <legend className={forms.label}>Colour</legend>
              <div className={forms.checks}>
                {NEWSFLASH_COLOURS.map((colour) => (
                  <label key={colour} className={forms.check}>
                    <input type="radio" name={id('colour')} checked={row.colour === colour} onChange={() => onChange({ colour })} />
                    <span>{NEWSFLASH_COLOUR_LABELS[colour]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={id('animation')}>
                Animation
              </label>
              <select
                id={id('animation')}
                className={forms.input}
                value={row.animation}
                aria-describedby={id('animation-note')}
                onChange={(e) => onChange({ animation: e.target.value as NewsflashAnimation })}
              >
                {NEWSFLASH_ANIMATIONS.map((animation) => (
                  <option key={animation} value={animation}>
                    {NEWSFLASH_ANIMATION_LABELS[animation]}
                  </option>
                ))}
              </select>
              <p id={id('animation-note')} className={forms.hint}>
                The preview above plays it. Anybody whose phone or computer asks for less motion sees it still.
              </p>
            </div>

            <div className={forms.checks}>
              <label className={forms.check}>
                <input type="checkbox" checked={row.closable} onChange={(e) => onChange({ closable: e.target.checked })} />
                <span>Visitors can close it</span>
              </label>
              <label className={forms.check}>
                <input type="checkbox" checked={row.first} onChange={(e) => onChange({ first: e.target.checked })} />
                <span>Show this one first</span>
              </label>
            </div>

            {problems.length > 0 ? (
              <ul className={forms.error}>
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : null}

            <div className={forms.actions}>
              <ConfirmButton aria-label={`Take down ${what}`} title={`Take down ${what}?`} body={UNTIL_SAVED} confirmLabel="Take it down" onConfirm={onRemove}>
                Take this newsflash down
              </ConfirmButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
