import { useState } from 'react'
import { Button } from '@/components/Button'
import {
  HOME_SECTIONS,
  HOME_SECTION_LABELS,
  SETTING_LABELS,
  SITE_TEXT_FIELDS,
  SITE_TEXT_KEYS,
  rollFromText,
  rollToText,
  tidyCommittee,
  type SectionAudience,
  type SiteSettings,
} from '@/domain/settings'
import { isPlaceholder } from '@/app/site'
import styles from './ContentForms.module.css'

const AUDIENCES: { value: SectionAudience; label: string }[] = [
  { value: 'public', label: 'Anybody' },
  { value: 'members', label: 'Members, once signed in' },
  { value: 'admins', label: 'The committee only' },
]

/**
 * The switches that used to be a code change.
 *
 * Each one says what it does underneath, because a row of unlabelled toggles is a good way to
 * have somebody turn the gallery off by accident and not know which one did it.
 *
 * Nothing saves as it is clicked. These change what every visitor sees, so they are a decision
 * with a Save under it rather than five separate live edits.
 */
export function SiteSwitches({
  settings,
  onSave,
  saving,
  saved,
  error,
}: {
  settings: SiteSettings
  onSave: (draft: SiteSettings) => void
  saving?: boolean
  saved?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<SiteSettings>(() => ({
    ...settings,
    home: { ...settings.home },
    text: { ...settings.text },
    committee: settings.committee.map((row) => ({ ...row })),
    members: [...settings.members],
  }))
  /** Held as typed, so a half-written line does not vanish between keystrokes. */
  const [roll, setRoll] = useState(() => rollToText(settings.members))
  const changed =
    JSON.stringify({ ...draft, committee: tidyCommittee(draft.committee), members: rollFromText(roll) }) !==
    JSON.stringify(settings)

  const setRow = (i: number, changes: Partial<(typeof draft.committee)[number]>) =>
    setDraft({ ...draft, committee: draft.committee.map((row, j) => (i === j ? { ...row, ...changes } : row)) })

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...draft, committee: tidyCommittee(draft.committee), members: rollFromText(roll) })
      }}
    >
      <fieldset className={styles.form} style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className={styles.label}>What the public site shows</legend>
        {(Object.keys(SETTING_LABELS) as (keyof typeof SETTING_LABELS)[]).map((key) => (
          <div key={key} className={styles.check}>
            <input
              id={key}
              type="checkbox"
              checked={draft[key]}
              aria-describedby={`${key}-note`}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
            />
            <span>
              <label htmlFor={key}>{SETTING_LABELS[key].label}</label>
              <span id={`${key}-note`} className={styles.hint}>
                {SETTING_LABELS[key].note}
              </span>
            </span>
          </div>
        ))}
      </fieldset>

      <fieldset className={styles.form} style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className={styles.label}>The words on the public pages</legend>
        <p className={styles.hint}>
          Only the lines that change. The FAQ, the committee list and the captions under the theme
          photographs still live in the files — ask a developer for those.
        </p>
        {SITE_TEXT_KEYS.map((key) => {
          const field = SITE_TEXT_FIELDS[key]
          const bracketed = isPlaceholder(draft.text[key] ?? '')
          return (
            <div key={key} className={styles.field}>
              <label className={styles.label} htmlFor={`text-${key}`}>
                {field.label}
              </label>
              {field.lines ? (
                <textarea
                  id={`text-${key}`}
                  className={styles.textarea}
                  rows={field.lines}
                  value={draft.text[key] ?? ''}
                  aria-describedby={`text-${key}-note`}
                  onChange={(e) => setDraft({ ...draft, text: { ...draft.text, [key]: e.target.value } })}
                />
              ) : (
                <input
                  id={`text-${key}`}
                  className={styles.input}
                  value={draft.text[key] ?? ''}
                  aria-describedby={`text-${key}-note`}
                  onChange={(e) => setDraft({ ...draft, text: { ...draft.text, [key]: e.target.value } })}
                />
              )}
              <p id={`text-${key}-note`} className={styles.hint}>
                {field.note}
                {/* The bracket convention is the one thing about these files somebody has to be
                    told, and this is the moment they would meet it. */}
                {bracketed ? ' Still in brackets, so visitors are shown nothing here.' : ''}
              </p>
            </div>
          )
        })}
      </fieldset>

      <fieldset className={styles.form} style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className={styles.label}>The committee</legend>
        <p className={styles.hint}>
          As shown on the About page, in this order — which is not a ranking. It changes at the AGM
          every year, which is exactly the sort of thing that should not need a developer.
        </p>
        {draft.committee.map((row, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`role-${i}`}>
                Role {i + 1}
              </label>
              <input
                id={`role-${i}`}
                className={styles.input}
                value={row.role}
                onChange={(e) => setRow(i, { role: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`name-${i}`}>
                Name {i + 1}
              </label>
              <input
                id={`name-${i}`}
                className={styles.input}
                value={row.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
              />
            </div>
            <div className={styles.actions} style={{ alignSelf: 'end', paddingBottom: 2 }}>
              <Button
                variant="line"
                size="sm"
                aria-label={`Remove ${row.name || `row ${i + 1}`}`}
                onClick={() => setDraft({ ...draft, committee: draft.committee.filter((_, j) => j !== i) })}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        <div className={styles.actions}>
          <Button
            variant="line"
            size="sm"
            onClick={() => setDraft({ ...draft, committee: [...draft.committee, { role: '', name: '' }] })}
          >
            Add somebody
          </Button>
        </div>
      </fieldset>

      <fieldset className={styles.form} style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className={styles.label}>The members’ roll</legend>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="roll">
            One name to a line
          </label>
          <textarea
            id="roll"
            className={styles.textarea}
            rows={10}
            value={roll}
            aria-describedby="roll-note"
            onChange={(e) => setRoll(e.target.value)}
          />
          <p id="roll-note" className={styles.hint}>
            Names only — nothing here says where anybody lives, how old they are or how to reach
            them. {rollFromText(roll).length} on the roll. Take a name out the day its owner asks;
            that used to mean waiting for a developer.
          </p>
        </div>
      </fieldset>

      <fieldset className={styles.form} style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className={styles.label}>Who each part of the home page is for</legend>
        <p className={styles.hint}>
          A section set to the committee is a way of getting something ready where only you can see
          it. Nothing here makes anything private — it decides what is drawn, not what is sent.
        </p>
        <div className={styles.row}>
          {HOME_SECTIONS.map((section) => (
            <div key={section} className={styles.field}>
              <label className={styles.label} htmlFor={`home-${section}`}>
                {HOME_SECTION_LABELS[section]}
              </label>
              <select
                id={`home-${section}`}
                className={styles.input}
                value={draft.home[section]}
                onChange={(e) =>
                  setDraft({ ...draft, home: { ...draft.home, [section]: e.target.value as SectionAudience } })
                }
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button variant="gold" type="submit" size="sm" disabled={saving || !changed}>
          {saving ? 'Saving…' : 'Save the switches'}
        </Button>
        {saved && !changed ? (
          <span className={styles.hint} role="status">
            Saved. The site changes for everybody straight away.
          </span>
        ) : null}
        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  )
}
