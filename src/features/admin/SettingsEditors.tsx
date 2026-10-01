import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { PhotoUpload } from '@/components/PhotoUpload'
import type { Festival } from '@/domain/festival'
import { HOME_SECTION_LABELS, type HomeBlock } from '@/domain/settings'
import {
  SOCIAL_ICONS,
  SOCIAL_ICON_LABELS,
  VALUE_ICONS,
  VALUE_ICON_LABELS,
  isWebAddress,
  type SocialChannel,
  type SocialIcon,
  type ThemeCollage,
  type ThemePhoto,
  type Tool,
  type ValueCard,
  type ValueIcon,
} from '@/domain/siteContent'
import { slugFrom } from '@/domain/slug'
import { readSupabaseConfig } from '@/lib/api/supabase'
import { readUploadConfig, uploadPhoto, UploadNotConfigured } from '@/lib/api/uploads'
import { accessToken } from '@/lib/auth/supabaseAuth'
import styles from './ContentForms.module.css'

/**
 * The editors for the parts of the site that are lists.
 *
 * Each one is given a list and says what the list should become; none of them saves anything.
 * Saving belongs to the section it sits in, which is what lets a half-finished festival stay
 * half-finished while somebody saves the committee further down the page.
 */

/** The same list with one row somewhere else. */
function moved<T>(rows: readonly T[], from: number, by: -1 | 1): T[] {
  const to = from + by
  if (to < 0 || to >= rows.length) return [...rows]
  const next = [...rows]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

/**
 * Up, down and remove, for one row.
 *
 * Buttons rather than dragging. A list of four festivals is reordered about once a year, by
 * somebody on whatever they have to hand, and "Move Holi up" is a thing a keyboard, a phone
 * and a screen reader can all do without being taught.
 */
function RowTools({
  what,
  index,
  count,
  onMove,
  onRemove,
}: {
  /** What the row is called, for the buttons' names: "Holi", "question 3". */
  what: string
  index: number
  count: number
  onMove?: (by: -1 | 1) => void
  onRemove?: () => void
}) {
  return (
    <div className={styles.actions}>
      {onMove ? (
        <>
          <Button variant="line" size="sm" aria-label={`Move ${what} up`} disabled={index === 0} onClick={() => onMove(-1)}>
            Up
          </Button>
          <Button
            variant="line"
            size="sm"
            aria-label={`Move ${what} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            Down
          </Button>
        </>
      ) : null}
      {onRemove ? (
        <Button variant="line" size="sm" aria-label={`Remove ${what}`} onClick={onRemove}>
          Remove
        </Button>
      ) : null}
    </div>
  )
}

const change = <T,>(rows: readonly T[], i: number, changes: Partial<T>): T[] =>
  rows.map((row, j) => (i === j ? { ...row, ...changes } : row))

/* ---------------------------------------------------------------- the home page */

export function OrderEditor({ order, onChange }: { order: HomeBlock[]; onChange: (order: HomeBlock[]) => void }) {
  return (
    <ol className={styles.orderList}>
      {order.map((block, i) => (
        <li key={block} className={styles.orderRow}>
          <span className={styles.orderName}>
            {i + 1}. {HOME_SECTION_LABELS[block]}
          </span>
          <RowTools
            what={HOME_SECTION_LABELS[block]}
            index={i}
            count={order.length}
            onMove={(by) => onChange(moved(order, i, by))}
          />
        </li>
      ))}
    </ol>
  )
}

/* ---------------------------------------------------------------- ways to reach us */

export function SocialEditor({ rows, onChange }: { rows: SocialChannel[]; onChange: (rows: SocialChannel[]) => void }) {
  return (
    <>
      {rows.map((row, i) => {
        const what = row.name || `channel ${i + 1}`
        // Said beside the box rather than after pressing Save: an address that is not one is
        // dropped on the way out, and a link that silently went missing is hard to trace back.
        const notAnAddress = row.href.trim() !== '' && !isWebAddress(row.href)
        return (
          <div key={i} className={styles.card}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`social-name-${i}`}>
                  Channel {i + 1}
                </label>
                <input
                  id={`social-name-${i}`}
                  className={styles.input}
                  value={row.name}
                  // The sentence form belonged to the old name. It falls back to the new one.
                  onChange={(e) => onChange(change(rows, i, { name: e.target.value, mention: undefined }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`social-icon-${i}`}>
                  Its mark
                </label>
                <select
                  id={`social-icon-${i}`}
                  className={styles.input}
                  value={row.icon}
                  onChange={(e) => onChange(change(rows, i, { icon: e.target.value as SocialIcon }))}
                >
                  {SOCIAL_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {SOCIAL_ICON_LABELS[icon]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`social-href-${i}`}>
                Address of {what}
              </label>
              <input
                id={`social-href-${i}`}
                className={styles.input}
                inputMode="url"
                placeholder="https://"
                value={row.href}
                aria-invalid={notAnAddress ? true : undefined}
                aria-describedby={`social-href-${i}-note`}
                onChange={(e) => onChange(change(rows, i, { href: e.target.value }))}
              />
              <p id={`social-href-${i}-note`} className={notAnAddress ? styles.error : styles.hint}>
                {notAnAddress
                  ? 'That does not look like a web address, so it would be saved without a link. It needs to start with https://'
                  : 'Leave it empty for something people have to be added to. It is then named on the contact page, without a link.'}
              </p>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`social-blurb-${i}`}>
                What {what} is for
              </label>
              <input
                id={`social-blurb-${i}`}
                className={styles.input}
                value={row.blurb}
                onChange={(e) => onChange(change(rows, i, { blurb: e.target.value }))}
              />
            </div>
            <RowTools
              what={what}
              index={i}
              count={rows.length}
              onMove={(by) => onChange(moved(rows, i, by))}
              onRemove={() => onChange(rows.filter((_, j) => j !== i))}
            />
          </div>
        )
      })}
      <div className={styles.actions}>
        <Button variant="line" size="sm" onClick={() => onChange([...rows, { name: '', icon: 'link', href: '', blurb: '' }])}>
          Add a channel
        </Button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- festivals */

export function FestivalEditor({ rows, onChange }: { rows: Festival[]; onChange: (rows: Festival[]) => void }) {
  return (
    <>
      {rows.map((row, i) => {
        const what = row.name || `festival ${i + 1}`
        return (
          <div key={i} className={styles.card}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`festival-name-${i}`}>
                  Festival {i + 1}
                </label>
                <input
                  id={`festival-name-${i}`}
                  className={styles.input}
                  value={row.name}
                  onChange={(e) => onChange(change(rows, i, { name: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`festival-bengali-${i}`}>
                  In Bengali
                </label>
                <input
                  id={`festival-bengali-${i}`}
                  className={styles.input}
                  lang="bn"
                  value={row.bengaliName ?? ''}
                  onChange={(e) => onChange(change(rows, i, { bengaliName: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`festival-season-${i}`}>
                  Roughly when
                </label>
                <input
                  id={`festival-season-${i}`}
                  className={styles.input}
                  placeholder="March"
                  value={row.season ?? ''}
                  onChange={(e) => onChange(change(rows, i, { season: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`festival-description-${i}`}>
                What happens at {what}
              </label>
              <textarea
                id={`festival-description-${i}`}
                className={styles.textarea}
                rows={2}
                value={row.description ?? ''}
                onChange={(e) => onChange(change(rows, i, { description: e.target.value }))}
              />
            </div>
            <RowTools
              what={what}
              index={i}
              count={rows.length}
              onMove={(by) => onChange(moved(rows, i, by))}
              onRemove={() => onChange(rows.filter((_, j) => j !== i))}
            />
          </div>
        )
      })}
      <div className={styles.actions}>
        {/* No id yet: it takes one from its name when it is saved, and keeps it after that. */}
        <Button variant="line" size="sm" onClick={() => onChange([...rows, { id: '', name: '' }])}>
          Add a festival
        </Button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- what we stand for */

export function ValuesEditor({ rows, onChange }: { rows: ValueCard[]; onChange: (rows: ValueCard[]) => void }) {
  return (
    <>
      {rows.map((row, i) => {
        const what = row.title || `value ${i + 1}`
        return (
          <div key={i} className={styles.card}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`value-title-${i}`}>
                  Value {i + 1}
                </label>
                <input
                  id={`value-title-${i}`}
                  className={styles.input}
                  value={row.title}
                  onChange={(e) => onChange(change(rows, i, { title: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`value-icon-${i}`}>
                  Its drawing
                </label>
                <span className={styles.withIcon}>
                  <Icon name={row.icon} size={24} />
                  <select
                    id={`value-icon-${i}`}
                    className={styles.input}
                    value={row.icon}
                    onChange={(e) => onChange(change(rows, i, { icon: e.target.value as ValueIcon }))}
                  >
                    {VALUE_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {VALUE_ICON_LABELS[icon]}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`value-text-${i}`}>
                What {what} means
              </label>
              <textarea
                id={`value-text-${i}`}
                className={styles.textarea}
                rows={2}
                value={row.text}
                onChange={(e) => onChange(change(rows, i, { text: e.target.value }))}
              />
            </div>
            <RowTools
              what={what}
              index={i}
              count={rows.length}
              onMove={(by) => onChange(moved(rows, i, by))}
              onRemove={() => onChange(rows.filter((_, j) => j !== i))}
            />
          </div>
        )
      })}
      <div className={styles.actions}>
        <Button variant="line" size="sm" onClick={() => onChange([...rows, { icon: 'heart', title: '', text: '' }])}>
          Add a value
        </Button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- the theme's photographs */

/** Where the picture is held, as two numbers somebody can nudge rather than a CSS value. */
function focusOf(focus: string): [number, number] {
  const found = /^(\d{1,3})% (\d{1,3})%$/.exec(focus)
  return found ? [Number(found[1]), Number(found[2])] : [50, 50]
}

export function CollageEditor({ value, onChange }: { value: ThemeCollage; onChange: (value: ThemeCollage) => void }) {
  // Null where no bucket is configured, which the upload says out loud rather than failing.
  const uploads = readUploadConfig(import.meta.env)
  const supabase = readSupabaseConfig(import.meta.env)
  const setPhoto = (i: number, changes: Partial<ThemePhoto>) =>
    onChange({ ...value, photos: change(value.photos, i, changes) })

  return (
    <>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="collage-label">
            What the collage is called
          </label>
          <input
            id="collage-label"
            className={styles.input}
            value={value.label}
            aria-describedby="collage-label-note"
            onChange={(e) => onChange({ ...value, label: e.target.value })}
          />
          <p id="collage-label-note" className={styles.hint}>
            Read out to somebody using a screen reader, so it should name this year’s theme.
          </p>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="collage-credit">
            Who took them
          </label>
          <input
            id="collage-credit"
            className={styles.input}
            value={value.credit}
            aria-describedby="collage-credit-note"
            onChange={(e) => onChange({ ...value, credit: e.target.value })}
          />
          <p id="collage-credit-note" className={styles.hint}>
            Printed under the photographs. Empty leaves the credit off.
          </p>
        </div>
      </div>

      {value.photos.map((photo, i) => {
        const what = `photograph ${i + 1}`
        const [x, y] = focusOf(photo.focus)
        return (
          <div key={photo.src} className={styles.card}>
            <div className={styles.photoRow}>
              <img
                src={photo.src}
                alt=""
                className={styles.thumb}
                style={{ objectPosition: photo.focus }}
                loading="lazy"
              />
              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`photo-caption-${i}`}>
                    Caption of {what}
                  </label>
                  <input
                    id={`photo-caption-${i}`}
                    className={styles.input}
                    value={photo.caption}
                    onChange={(e) => setPhoto(i, { caption: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`photo-alt-${i}`}>
                    What is in {what}
                  </label>
                  <input
                    id={`photo-alt-${i}`}
                    className={styles.input}
                    value={photo.alt}
                    aria-describedby={`photo-alt-${i}-note`}
                    onChange={(e) => setPhoto(i, { alt: e.target.value })}
                  />
                  <p id={`photo-alt-${i}-note`} className={styles.hint}>
                    For somebody who cannot see it: say what the picture shows, in a sentence.
                  </p>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`photo-x-${i}`}>
                      Hold {what} across, {x}%
                    </label>
                    <input
                      id={`photo-x-${i}`}
                      type="range"
                      min={0}
                      max={100}
                      value={x}
                      onChange={(e) => setPhoto(i, { focus: `${e.target.value}% ${y}%` })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`photo-y-${i}`}>
                      Hold {what} down, {y}%
                    </label>
                    <input
                      id={`photo-y-${i}`}
                      type="range"
                      min={0}
                      max={100}
                      value={y}
                      onChange={(e) => setPhoto(i, { focus: `${x}% ${e.target.value}%` })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <RowTools
              what={what}
              index={i}
              count={value.photos.length}
              onMove={(by) => onChange({ ...value, photos: moved(value.photos, i, by) })}
              onRemove={() => onChange({ ...value, photos: value.photos.filter((_, j) => j !== i) })}
            />
          </div>
        )
      })}

      <PhotoUpload
        canSend={Boolean(uploads)}
        label="Add a photograph for the theme"
        onSend={async (prepared, name) => {
          if (!uploads) throw new UploadNotConfigured()
          const key = `theme-${slugFrom(name.replace(/\.[^.]+$/, '')) || 'photo'}`
          // The function asks the database whether this person is on the committee, with
          // their own token, before it signs anything.
          const token = supabase ? await accessToken(supabase) : null
          if (!token) throw new Error('Sign in first.')
          return uploadPhoto(uploads, key, prepared, token)
        }}
        onDone={(url) => {
          if (value.photos.some((photo) => photo.src === url)) return
          onChange({ ...value, photos: [...value.photos, { src: url, alt: '', caption: '', focus: '50% 50%' }] })
        }}
      />
    </>
  )
}

/* ---------------------------------------------------------------- the privacy notice */

/** A section of the notice as it is typed: the body as one box, a paragraph to a line. */
export type PrivacyRow = { title: string; text: string }

export function PrivacyEditor({
  rows,
  controller,
  onRows,
  onController,
}: {
  rows: PrivacyRow[]
  controller: string
  onRows: (rows: PrivacyRow[]) => void
  onController: (controller: string) => void
}) {
  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="privacy-controller">
          Who is responsible for the data
        </label>
        <input
          id="privacy-controller"
          className={styles.input}
          value={controller}
          onChange={(e) => onController(e.target.value)}
        />
      </div>
      {rows.map((row, i) => {
        const what = row.title || `section ${i + 1}`
        return (
          <div key={i} className={styles.card}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`privacy-title-${i}`}>
                Heading {i + 1}
              </label>
              <input
                id={`privacy-title-${i}`}
                className={styles.input}
                value={row.title}
                onChange={(e) => onRows(change(rows, i, { title: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`privacy-text-${i}`}>
                What it says under {what}
              </label>
              <textarea
                id={`privacy-text-${i}`}
                className={styles.textarea}
                rows={6}
                value={row.text}
                onChange={(e) => onRows(change(rows, i, { text: e.target.value }))}
              />
            </div>
            <RowTools
              what={what}
              index={i}
              count={rows.length}
              onMove={(by) => onRows(moved(rows, i, by))}
              onRemove={() => onRows(rows.filter((_, j) => j !== i))}
            />
          </div>
        )
      })}
      <div className={styles.actions}>
        <Button variant="line" size="sm" onClick={() => onRows([...rows, { title: '', text: '' }])}>
          Add a section
        </Button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- other tools */

export function ToolsEditor({ rows, onChange }: { rows: Tool[]; onChange: (rows: Tool[]) => void }) {
  return (
    <>
      {rows.map((row, i) => {
        const what = row.name || `tool ${i + 1}`
        const notAnAddress = row.href.trim() !== '' && !isWebAddress(row.href)
        return (
          <div key={i} className={styles.card}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`tool-name-${i}`}>
                  Tool {i + 1}
                </label>
                <input
                  id={`tool-name-${i}`}
                  className={styles.input}
                  value={row.name}
                  onChange={(e) => onChange(change(rows, i, { name: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`tool-href-${i}`}>
                  Address of {what}
                </label>
                <input
                  id={`tool-href-${i}`}
                  className={styles.input}
                  inputMode="url"
                  placeholder="https://"
                  value={row.href}
                  aria-invalid={notAnAddress ? true : undefined}
                  onChange={(e) => onChange(change(rows, i, { href: e.target.value }))}
                />
                {notAnAddress ? (
                  <p className={styles.error}>
                    That does not look like a web address, so this tool would not be saved. It needs to start with https://
                  </p>
                ) : null}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`tool-description-${i}`}>
                What {what} is for
              </label>
              <input
                id={`tool-description-${i}`}
                className={styles.input}
                value={row.description}
                onChange={(e) => onChange(change(rows, i, { description: e.target.value }))}
              />
            </div>
            <RowTools
              what={what}
              index={i}
              count={rows.length}
              onMove={(by) => onChange(moved(rows, i, by))}
              onRemove={() => onChange(rows.filter((_, j) => j !== i))}
            />
          </div>
        )
      })}
      <div className={styles.actions}>
        <Button variant="line" size="sm" onClick={() => onChange([...rows, { name: '', description: '', href: '' }])}>
          Add a tool
        </Button>
      </div>
    </>
  )
}
