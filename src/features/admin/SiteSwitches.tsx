import { useState } from 'react'
import { Button } from '@/components/Button'
import {
  HOME_SECTIONS,
  HOME_SECTION_LABELS,
  SETTING_LABELS,
  SITE_TEXT_FIELDS,
  SITE_TEXT_KEYS,
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
  }))
  const changed = JSON.stringify(draft) !== JSON.stringify(settings)

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        onSave(draft)
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
