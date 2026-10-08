import { useState } from 'react'
import { ActionBar } from '@/components/ActionBar'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { PhotoUpload } from '@/components/PhotoUpload'
import { SponsorLogo } from '@/components/SponsorLogo'
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
import {
  SPONSOR_LEVELS,
  SPONSOR_LEVEL_LABELS,
  LOGO_GUIDE,
  SPONSOR_BLURB_MAX,
  SPONSOR_NAME_MAX,
  blankSponsor,
  isLogoAddress,
  isSponsorLink,
  sponsorLinkOf,
  whyNotShown,
  type Sponsor,
} from '@/domain/sponsors'
import { readSupabaseConfig } from '@/lib/api/supabase'
import { photoKey, readUploadConfig, uploadPhoto, UploadNotConfigured } from '@/lib/api/uploads'
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
      <ActionBar sticky={false}>
        <Button variant="line" size="sm" onClick={() => onChange([...rows, { name: '', icon: 'link', href: '', blurb: '' }])}>
          Add a channel
        </Button>
      </ActionBar>
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
    </>
  )
}

/* ---------------------------------------------------------------- festivals */

export function FestivalEditor({ rows, onChange }: { rows: Festival[]; onChange: (rows: Festival[]) => void }) {
  return (
    <>
      <ActionBar sticky={false}>
        {/* No id yet: it takes one from its name when it is saved, and keeps it after that. */}
        <Button variant="line" size="sm" onClick={() => onChange([...rows, { id: '', name: '' }])}>
          Add a festival
        </Button>
      </ActionBar>
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
    </>
  )
}

/* ---------------------------------------------------------------- what we stand for */

export function ValuesEditor({ rows, onChange }: { rows: ValueCard[]; onChange: (rows: ValueCard[]) => void }) {
  return (
    <>
      <ActionBar sticky={false}>
        <Button variant="line" size="sm" onClick={() => onChange([...rows, { icon: 'heart', title: '', text: '' }])}>
          Add a value
        </Button>
      </ActionBar>
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
          const key = photoKey('theme', name.replace(/\.[^.]+$/, ''))
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
      <ActionBar sticky={false}>
        <Button variant="line" size="sm" onClick={() => onRows([...rows, { title: '', text: '' }])}>
          Add a section
        </Button>
      </ActionBar>
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
    </>
  )
}

/* ---------------------------------------------------------------- other tools */

export function ToolsEditor({ rows, onChange }: { rows: Tool[]; onChange: (rows: Tool[]) => void }) {
  return (
    <>
      <ActionBar sticky={false}>
        <Button variant="line" size="sm" onClick={() => onChange([...rows, { name: '', description: '', href: '' }])}>
          Add a tool
        </Button>
      </ActionBar>
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
    </>
  )
}

/* ---------------------------------------------------------------- sponsors */

/**
 * The sponsors, one card each.
 *
 * The festivals offered are the saved ones, not the ones being typed above: a festival has no
 * id until it is saved, and a sponsor filed under an id that does not exist yet is filed under
 * nothing.
 */
export function SponsorsEditor({
  rows,
  festivals,
  onChange,
  actions,
}: {
  rows: Sponsor[]
  festivals: Festival[]
  onChange: (rows: Sponsor[]) => void
  /** The screen's own buttons — its Save — beside Add, at the top right and held in view. */
  actions?: React.ReactNode
}) {
  const uploads = readUploadConfig(import.meta.env)
  const supabase = readSupabaseConfig(import.meta.env)
  /** The row somebody has asked to remove, waiting for them to say they meant it. */
  const [removing, setRemoving] = useState<number | null>(null)
  /** Logos that would not load, by address, so the card can say so. */
  const [broken, setBroken] = useState<string[]>([])
  /** Logos far wider than they are tall, by address: they come out too small to read on a tile. */
  const [wide, setWide] = useState<string[]>([])
  const set = (i: number, changes: Partial<Sponsor>) => onChange(change(rows, i, changes))

  return (
    <>
      <ActionBar sticky={Boolean(actions)} status={actions ? undefined : null}>
        <Button variant="line" size="sm" onClick={() => onChange([...rows, blankSponsor()])}>
          Add a sponsor
        </Button>
        {actions}
      </ActionBar>
      <details className={styles.guide}>
        <summary>What makes a good logo, and how big it is drawn</summary>
        <ul>
          <li>{LOGO_GUIDE.files}. {LOGO_GUIDE.smallest}.</li>
          <li>{LOGO_GUIDE.shape}</li>
          <li>{LOGO_GUIDE.ground}</li>
        </ul>
        <table>
          <tbody>
            {LOGO_GUIDE.sizes.map((row) => (
              <tr key={row.where}>
                <th scope="row">{row.where}</th>
                <td>{row.size} pixels</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Names up to {SPONSOR_NAME_MAX} characters, and the one line about them up to {SPONSOR_BLURB_MAX}.
        </p>
      </details>
      {rows.length === 0 ? (
        <p className={styles.hint}>No sponsors yet. Add the first; nothing shows until Sponsors is switched on.</p>
      ) : null}
      {rows.map((row, i) => {
        const what = row.name.trim() || `sponsor ${i + 1}`
        const linkWrong = row.href.trim() !== '' && !sponsorLinkOf(row.href)
        const logoWrong = row.logo.trim() !== '' && !isLogoAddress(row.logo)
        const logoBroken = !logoWrong && row.logo.trim() !== '' && broken.includes(row.logo.trim())
        const logoWide = !logoWrong && !logoBroken && wide.includes(row.logo.trim())
        const waiting = whyNotShown({ ...row, name: what })
        return (
          <div key={i} className={styles.card}>
            {/* Who, and whether they are on the website: the one decision about a sponsor that
                is made more than once a year, so it is the first thing on the card. */}
            <div className={styles.sponsorHead}>
              <span className={styles.sponsorTitle}>{row.name.trim() || `Sponsor ${i + 1}`}</span>
              {waiting ? <span className={styles.badge}>{waiting}</span> : null}
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  role="switch"
                  checked={row.shown}
                  onChange={(e) => set(i, { shown: e.target.checked })}
                />
                <span aria-hidden="true" className={styles.switchTrack} />
                <span>On the website</span>
              </label>
            </div>
            <div className={styles.photoRow}>
              <div className={styles.sponsorPreview}>
                <SponsorLogo
                  name={row.name.trim() || 'Their name'}
                  logo={logoWrong ? '' : row.logo.trim()}
                  alt=""
                  onFailed={() => setBroken((now) => [...now, row.logo.trim()])}
                  onShape={(ratio) => {
                    const src = row.logo.trim()
                    if (ratio > 4) setWide((now) => (now.includes(src) ? now : [...now, src]))
                  }}
                />
                <p className={styles.hint}>As it will look on the site.</p>
                {logoWide ? (
                  <p className={styles.error}>
                    This logo is very wide, so it comes out small. Ask them for a stacked or square version.
                  </p>
                ) : null}
              </div>
              <div className={styles.form}>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`sponsor-name-${i}`}>
                      Sponsor {i + 1}
                    </label>
                    <input
                      id={`sponsor-name-${i}`}
                      className={styles.input}
                      value={row.name}
                      maxLength={SPONSOR_NAME_MAX}
                      aria-describedby={`sponsor-name-${i}-note`}
                      onChange={(e) => set(i, { name: e.target.value })}
                    />
                    <p id={`sponsor-name-${i}-note`} className={styles.hint}>
                      As it should read in a sentence: “Raj Sweets”, “the Bose family”, “In memory of …”.{' '}
                      <span className={styles.counter}>
                        {row.name.length} of {SPONSOR_NAME_MAX}
                      </span>
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`sponsor-level-${i}`}>
                      Level
                    </label>
                    <select
                      id={`sponsor-level-${i}`}
                      className={styles.input}
                      value={row.level}
                      aria-describedby={`sponsor-level-${i}-note`}
                      onChange={(e) => set(i, { level: e.target.value as Sponsor['level'] })}
                    >
                      <option value="">No level</option>
                      {SPONSOR_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {SPONSOR_LEVEL_LABELS[level]}
                        </option>
                      ))}
                    </select>
                    <p id={`sponsor-level-${i}-note`} className={styles.hint}>
                      Sets how large the logo is drawn. No level comes after Friends.
                    </p>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`sponsor-href-${i}`}>
                    Their website
                  </label>
                  <input
                    id={`sponsor-href-${i}`}
                    className={styles.input}
                    inputMode="url"
                    placeholder="https://"
                    value={row.href}
                    aria-invalid={linkWrong ? true : undefined}
                    aria-describedby={`sponsor-href-${i}-note`}
                    onChange={(e) => set(i, { href: e.target.value })}
                  />
                  {linkWrong ? (
                    <p id={`sponsor-href-${i}-note`} className={styles.error}>
                      That does not look like a web address, so it would be saved without a link. It needs to start with https://
                    </p>
                  ) : (
                    <p id={`sponsor-href-${i}-note`} className={styles.hint}>
                      Their own site. Empty shows the name without a link.
                      {row.href.trim() && !isSponsorLink(row.href) ? ` Saved as ${sponsorLinkOf(row.href)}` : ''}
                    </p>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`sponsor-blurb-${i}`}>
                    One line about {what}
                  </label>
                  <textarea
                    id={`sponsor-blurb-${i}`}
                    className={styles.textarea}
                    rows={2}
                    value={row.blurb}
                    maxLength={SPONSOR_BLURB_MAX}
                    aria-describedby={`sponsor-blurb-${i}-note`}
                    onChange={(e) => set(i, { blurb: e.target.value })}
                  />
                  <p id={`sponsor-blurb-${i}-note`} className={styles.hint}>
                    Under their name on the Sponsors page — what they do, or why they help.{' '}
                    <span className={styles.counter}>
                      {row.blurb.length} of {SPONSOR_BLURB_MAX}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <p className={styles.hint}>
              The logo: {LOGO_GUIDE.files}, at least 600 pixels wide. Wider than tall suits it best, and
              it goes on white.
            </p>
            <PhotoUpload
              canSend={Boolean(uploads)}
              label={row.logo.trim() ? `Replace the logo of ${what}` : `Choose a logo for ${what}`}
              dropTitle="Drag their logo here"
              onSend={async (prepared, name) => {
                if (!uploads) throw new UploadNotConfigured()
                const key = photoKey('sponsor', name.replace(/\.[^.]+$/, ''))
                const token = supabase ? await accessToken(supabase) : null
                if (!token) throw new Error('Sign in first.')
                return uploadPhoto(uploads, key, prepared, token)
              }}
              onDone={(url) => set(i, { logo: url })}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`sponsor-logo-${i}`}>
                Or the address of their logo
              </label>
              <input
                id={`sponsor-logo-${i}`}
                className={styles.input}
                inputMode="url"
                placeholder="https://"
                value={row.logo}
                aria-invalid={logoWrong || logoBroken ? true : undefined}
                aria-describedby={`sponsor-logo-${i}-note`}
                onChange={(e) => set(i, { logo: e.target.value })}
              />
              {logoWrong ? (
                <p id={`sponsor-logo-${i}-note`} className={styles.error}>
                  That does not look like a web address, so it would be saved without a logo. It needs to start with https://
                </p>
              ) : logoBroken ? (
                <p id={`sponsor-logo-${i}-note`} className={styles.error}>
                  That logo would not load. Check the address, or upload the file instead.
                </p>
              ) : (
                <p id={`sponsor-logo-${i}-note`} className={styles.hint}>
                  Better to upload it: a picture kept on their site can change or disappear without us knowing.
                </p>
              )}
              {row.logo.trim() ? (
                <div className={styles.actions} style={{ marginTop: 6 }}>
                  <Button variant="line" size="sm" onClick={() => set(i, { logo: '' })}>
                    Take the logo off
                  </Button>
                </div>
              ) : null}
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>Helps put on</legend>
              {festivals.length === 0 ? (
                <p className={styles.hint}>No festivals saved yet. Add them under The year’s festivals.</p>
              ) : (
                <div className={styles.checks}>
                  {festivals.map((festival) => (
                    <label key={festival.id} className={styles.check}>
                      <input
                        type="checkbox"
                        checked={row.festivalIds.includes(festival.id)}
                        onChange={(e) =>
                          set(i, {
                            festivalIds: e.target.checked
                              ? [...row.festivalIds, festival.id]
                              : row.festivalIds.filter((id) => id !== festival.id),
                          })
                        }
                      />
                      <span>{festival.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className={styles.hint}>
                Their name goes on those festivals’ evenings and in “Our year”. A festival added above
                appears here once the festivals are saved.
              </p>
            </fieldset>

            <div className={styles.check}>
              <input
                id={`sponsor-person-${i}`}
                type="checkbox"
                checked={row.person}
                aria-describedby={`sponsor-person-${i}-note`}
                onChange={(e) => set(i, { person: e.target.checked, agreed: e.target.checked ? row.agreed : false })}
              />
              <span>
                <label htmlFor={`sponsor-person-${i}`}>A person or a family, not a business</label>
                <span id={`sponsor-person-${i}-note`} className={styles.hint}>
                  Somebody giving in memory of a relative, say.
                </span>
              </span>
            </div>
            {row.person ? (
              <div className={styles.check} style={{ marginInlineStart: 28 }}>
                <input
                  id={`sponsor-agreed-${i}`}
                  type="checkbox"
                  checked={row.agreed}
                  aria-describedby={`sponsor-agreed-${i}-note`}
                  onChange={(e) => set(i, { agreed: e.target.checked })}
                />
                <span>
                  <label htmlFor={`sponsor-agreed-${i}`}>They have said yes to their name being on the website</label>
                  <span id={`sponsor-agreed-${i}-note`} className={row.agreed ? styles.hint : styles.error}>
                    {row.agreed
                      ? 'Thank you. Check how they would like their name written.'
                      : 'Waiting for their agreement, so not on the site. Ask first — giving money is not agreeing to be named.'}
                  </span>
                </span>
              </div>
            ) : null}

            <RowTools
              what={what}
              index={i}
              count={rows.length}
              onMove={(by) => onChange(moved(rows, i, by))}
              // A row nobody has typed anything into goes without a question.
              onRemove={() => (row.name.trim() || row.logo.trim() ? setRemoving(i) : onChange(rows.filter((_, j) => j !== i)))}
            />
          </div>
        )
      })}
      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing !== null ? rows[removing]?.name.trim() || 'this sponsor' : ''}?`}
        confirmLabel="Remove them"
        onConfirm={() => {
          if (removing !== null) onChange(rows.filter((_, j) => j !== removing))
          setRemoving(null)
        }}
        onCancel={() => setRemoving(null)}
      >
        They come off the Sponsors page, the home page and their festivals when you save the
        sponsors. Their logo file is kept.
      </ConfirmDialog>
    </>
  )
}
