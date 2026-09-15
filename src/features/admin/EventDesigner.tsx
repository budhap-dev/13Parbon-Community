import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { CoverImage } from '@/components/CoverImage'
import { PhotoUpload } from '@/components/PhotoUpload'
import { Icon } from '@/components/Icon'
import { COVER_ANIMATIONS, type CoverAnimation } from '@/domain/cover'
import { daysUntil, describeCountdown, formatLongDate, formatTime } from '@/domain/dates'
import { blankEvent, tidyProgramme, validateEvent, type Event, type EventDraft, type EventErrors } from '@/domain/event'
import { useNow } from '@/lib/clock'
import { readUploadConfig, uploadPhoto, UploadNotConfigured } from '@/lib/api/uploads'
import { slugFrom } from '@/domain/slug'
import styles from './ContentForms.module.css'
import design from './EventDesigner.module.css'

const forInput = (iso?: string) => (iso ? iso.slice(0, 16) : '')

export function draftOfEvent(event: Event): EventDraft {
  return {
    title: event.title,
    summary: event.summary,
    startsAt: forInput(event.startsAt),
    endsAt: forInput(event.endsAt),
    venue: event.venue,
    venueAddress: event.venueAddress ?? '',
    coordinates: event.coordinates ?? null,
    coverImageUrl: event.coverImageUrl ?? '',
    coverAnimation: event.coverAnimation ?? 'none',
    theme: {
      bengali: event.theme?.bengali ?? '',
      bengaliSubtitle: event.theme?.bengaliSubtitle ?? '',
      english: event.theme?.english ?? '',
    },
    programme: event.programme ? [...event.programme] : [],
    registrationUrl: event.registrationUrl ?? '',
    performerFormUrl: event.performerFormUrl ?? '',
    registrationOpen: event.registrationOpen,
    volunteerCall: event.volunteerCall ?? '',
    performerCall: event.performerCall ?? '',
    householdsRegistered: event.householdsRegistered,
    status: event.status,
    isPublic: event.isPublic,
  }
}

/**
 * Designing how an event looks to somebody arriving to find out what is on.
 *
 * The committee's planner holds the logistics — tasks, teams, who is bringing the urn. This is
 * front of house, and the two overlap only on the title, the date and the venue.
 *
 * The preview is the point. These fields end up on a page nobody edits them next to, and a
 * theme in Bengali with a subtitle and an English rendering is hard to picture from four text
 * boxes. So the banner is drawn beside the form, from the same draft, as it is typed.
 */
export function EventDesigner({
  event,
  onSave,
  onCancel,
  saving,
  error,
}: {
  /** The evening being designed, or nothing at all when one is being added. */
  event?: Event
  onSave: (draft: EventDraft) => void
  onCancel: () => void
  saving?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<EventDraft>(() => (event ? draftOfEvent(event) : blankEvent()))
  const [errors, setErrors] = useState<EventErrors>({})
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const now = useNow()
  // Null where no bucket is configured, which the upload says out loud rather than failing.
  const uploads = readUploadConfig(import.meta.env)

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found = validateEvent(draft)
    setErrors(found)
    if (Object.keys(found).length === 0) onSave(draft)
  }

  const field = (
    key: 'title' | 'summary' | 'startsAt' | 'venue' | 'registrationUrl' | 'coverImageUrl',
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    hint?: string,
  ) => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={key}>
        {label}
      </label>
      <input
        id={key}
        className={styles.input}
        value={String(draft[key] ?? '')}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `${key}-error` : undefined}
        onChange={(e) => set(key, e.target.value as EventDraft[typeof key])}
        {...props}
      />
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {errors[key] ? (
        <p id={`${key}-error`} className={styles.error}>
          {errors[key]}
        </p>
      ) : null}
    </div>
  )

  const programme = tidyProgramme(draft.programme)
  const countdown = draft.startsAt ? describeCountdown(daysUntil(draft.startsAt, now)) : null

  // Editing something the public can already see is a different act from writing a draft, and
  // the screen should say so before somebody changes a venue on the morning of the event.
  const live = event?.status === 'published' && event.isPublic

  return (
    <div className={design.split}>
      <form className={styles.form} onSubmit={submit} noValidate>
        {live ? (
          <p className={design.live} role="status">
            <strong>This event is on the website.</strong> Anything you save here changes what
            visitors see straight away.
          </p>
        ) : null}
        {!event ? (
          <p className={styles.hint}>
            A new evening is saved as a draft whatever you choose below, so nothing reaches the
            website until you come back and publish it.
          </p>
        ) : null}
        {field('title', 'What it is called')}
        {field('summary', 'One line about it', {}, 'What somebody reads while deciding whether to come.')}

        <div className={styles.row}>
          {field('startsAt', 'Starts', { type: 'datetime-local' })}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="endsAt">
              Ends
            </label>
            <input
              id="endsAt"
              className={styles.input}
              type="datetime-local"
              value={draft.endsAt}
              onChange={(e) => set('endsAt', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          {field('venue', 'Venue')}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="venueAddress">
              Address
            </label>
            <input
              id="venueAddress"
              className={styles.input}
              value={draft.venueAddress}
              onChange={(e) => set('venueAddress', e.target.value)}
            />
            <p className={styles.hint}>Shown under the venue, and used for the map.</p>
          </div>
        </div>

        {field('coverImageUrl', 'Cover photograph', {}, 'The address it is served from. Choose a file below and this fills itself in.')}

        <PhotoUpload
          canSend={Boolean(uploads)}
          label="Choose a cover photograph"
          onSend={async (prepared, name) => {
            if (!uploads) throw new UploadNotConfigured()
            const key = `${slugFrom(draft.title) || 'event'}-cover-${slugFrom(name.replace(/\.[^.]+$/, '')) || 'photo'}`
            return uploadPhoto(uploads, key, prepared)
          }}
          onDone={(url) => set('coverImageUrl', url)}
        />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="coverAnimation">
            How it moves
          </label>
          <select
            id="coverAnimation"
            className={styles.input}
            value={draft.coverAnimation}
            aria-describedby="coverAnimation-note"
            onChange={(e) => set('coverAnimation', e.target.value as CoverAnimation)}
          >
            {COVER_ANIMATIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <p id="coverAnimation-note" className={styles.hint}>
            {COVER_ANIMATIONS.find((a) => a.value === draft.coverAnimation)?.note}
          </p>
          <p className={styles.hint}>
            Anybody who has asked their machine for less movement sees the photograph still,
            whichever of these is chosen.
          </p>
        </div>

        <fieldset className={styles.form} style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className={styles.label}>This year’s theme</legend>
          <p className={styles.hint}>
            Written in Bengali, with a plain English rendering so it reads to everybody. Nobody has to
            be Bengali to come. Leave it empty and the page simply does not show one.
          </p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="theme-bengali">
                In Bengali
              </label>
              <input
                id="theme-bengali"
                className={styles.input}
                value={draft.theme.bengali}
                onChange={(e) => set('theme', { ...draft.theme, bengali: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="theme-sub">
                Second half
              </label>
              <input
                id="theme-sub"
                className={styles.input}
                value={draft.theme.bengaliSubtitle}
                onChange={(e) => set('theme', { ...draft.theme, bengaliSubtitle: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="theme-english">
                In English
              </label>
              <input
                id="theme-english"
                className={styles.input}
                value={draft.theme.english}
                onChange={(e) => set('theme', { ...draft.theme, english: e.target.value })}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.form} style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className={styles.label}>The programme</legend>
          <p className={styles.hint}>
            What happens when. Not a line-up of speakers — the stage is filled by members who put
            their names down, which is what the call below asks for.
          </p>
          {draft.programme.map((line, i) => (
            <div key={i} className={design.line}>
              <input
                className={styles.input}
                type="time"
                aria-label={`Time for item ${i + 1}`}
                value={line.time}
                onChange={(e) =>
                  set('programme', draft.programme.map((l, j) => (i === j ? { ...l, time: e.target.value } : l)))
                }
              />
              <input
                className={styles.input}
                aria-label={`What happens at item ${i + 1}`}
                placeholder="Children’s dance"
                value={line.what}
                onChange={(e) =>
                  set('programme', draft.programme.map((l, j) => (i === j ? { ...l, what: e.target.value } : l)))
                }
              />
              <Button
                variant="line"
                size="sm"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => set('programme', draft.programme.filter((_, j) => j !== i))}
              >
                <Icon name="trash" />
              </Button>
            </div>
          ))}
          <div className={styles.actions}>
            <Button variant="line" size="sm" onClick={() => set('programme', [...draft.programme, { time: '', what: '' }])}>
              Add to the programme
            </Button>
          </div>
        </fieldset>

        <div className={styles.row}>
          {field('registrationUrl', 'Booking form', {}, 'Your Google Form. Replies stay in your sheet.')}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="performerFormUrl">
              Performers’ form
            </label>
            <input
              id="performerFormUrl"
              className={styles.input}
              value={draft.performerFormUrl}
              onChange={(e) => set('performerFormUrl', e.target.value)}
            />
            <p className={styles.hint}>Coming and being on the stage are two different things to put your name down for.</p>
          </div>
        </div>

        <div className={styles.check}>
          <input
            id="registrationOpen"
            type="checkbox"
            checked={draft.registrationOpen}
            onChange={(e) => set('registrationOpen', e.target.checked)}
          />
          <span>
            <label htmlFor="registrationOpen">Booking is open</label>
            <span className={styles.hint}>Off shows the event without a button, rather than one that goes nowhere.</span>
          </span>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className={styles.input}
              value={draft.status}
              onChange={(e) => set('status', e.target.value as EventDraft['status'])}
            >
              <option value="draft">Draft — only the committee sees it</option>
              <option value="published">Published — it is on the website</option>
              <option value="cancelled">Cancelled</option>
              <option value="past">Past</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="householdsRegistered">
              Households booked so far
            </label>
            <input
              id="householdsRegistered"
              className={styles.input}
              type="number"
              min={0}
              value={String(draft.householdsRegistered)}
              onChange={(e) => set('householdsRegistered', Number(e.target.value) || 0)}
            />
            <p className={styles.hint}>From your sheet. Shown as “N households are coming so far”.</p>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="gold" type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : event ? 'Save the event' : 'Add the event'}
          </Button>
          <Button variant="line" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          {error ? (
            <span className={styles.error} role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </form>

      {/* Drawn from the same draft as it is typed, because four text boxes are a poor way to
          picture a banner with a Bengali theme and a countdown in it. */}
      <aside className={design.preview} aria-label="How it will look">
        <div className={design.previewHead}>
          <p className={design.previewLabel}>How it will look</p>
          {/*
            A choice rather than a window you resize, because the preview is a box inside a page
            and a media query answers for the window, not for the box. On a laptop every media
            query says "desktop" however narrow this column happens to be — so the phone view is
            a class, and it is the real width of a phone rather than an impression of one.
          */}
          <div className={design.devices} role="group" aria-label="Preview width">
            {(['desktop', 'phone'] as const).map((which) => (
              <button
                key={which}
                type="button"
                className={device === which ? design.deviceOn : design.device}
                aria-pressed={device === which}
                onClick={() => setDevice(which)}
              >
                {which === 'desktop' ? 'Desktop' : 'Phone'}
              </button>
            ))}
          </div>
        </div>

        <div className={device === 'phone' ? design.phone : design.desktop}>
          <div className={design.card}>
            <CoverImage
              src={draft.coverImageUrl}
              animation={draft.coverAnimation}
              ratio={device === 'phone' ? '4 / 3' : '16 / 9'}
            />
            <div className={design.cardBody}>
              <p className={design.kicker}>Next event</p>
              <h3 className={draft.title ? design.title : design.titleEmpty}>
                {draft.title || 'Boishakhi 2027'}
              </h3>
              {draft.theme.bengali ? (
                <p className={design.theme}>
                  {draft.theme.bengali}
                  {draft.theme.bengaliSubtitle ? ` ${draft.theme.bengaliSubtitle}` : ''}
                  {draft.theme.english ? <span className={design.themeEnglish}> · {draft.theme.english}</span> : null}
                </p>
              ) : null}
              <p className={draft.startsAt || draft.venue ? design.meta : design.metaEmpty}>
                {draft.startsAt ? `${formatLongDate(draft.startsAt)}, ${formatTime(draft.startsAt)}` : 'Saturday 12 March, 7:00 pm'}
                {draft.venue ? ` · ${draft.venue}` : ' · St Andrew’s Community Hall'}
              </p>
              <p className={draft.summary ? design.summary : design.summaryEmpty}>
                {draft.summary || 'An evening of songs, dance and far too much food.'}
              </p>
              {countdown ? (
                <p className={design.countdown}>
                  <strong>{countdown.value}</strong> {countdown.label}
                </p>
              ) : null}
              {programme.length > 0 ? (
                <ul className={design.programme}>
                  {programme.map((line, i) => (
                    <li key={i}>
                      <strong>{line.time || '—'}</strong> {line.what}
                    </li>
                  ))}
                </ul>
              ) : null}
              {draft.registrationOpen && draft.registrationUrl ? (
                <p className={design.cta}>Book your places</p>
              ) : (
                <p className={design.ctaOff}>
                  No booking button — {draft.registrationOpen ? 'no form address yet' : 'booking is closed'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Greyed text is a stand-in, not a value that will be saved. Saying so is cheaper than
            somebody publishing an evening called Boishakhi 2027 that they never typed. */}
        {!draft.title || !draft.summary || !draft.startsAt ? (
          <p className={design.standIn}>Anything faded is a stand-in, to show the shape. It is not saved.</p>
        ) : null}
      </aside>
    </div>
  )
}
