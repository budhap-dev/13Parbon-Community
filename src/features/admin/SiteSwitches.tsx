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
  tidyFaq,
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

type SectionKey = 'switches' | 'words' | 'committee' | 'faq' | 'roll' | 'home'

const SWITCH_KEYS = Object.keys(SETTING_LABELS) as (keyof typeof SETTING_LABELS)[]

/**
 * Six unrelated jobs, and each one saves on its own.
 *
 * This was a single form six fieldsets long with one button at the bottom of it saying "save
 * the switches" — which was the right name for one section and the wrong name for the other
 * five. Changing the venue meant scrolling past the committee, the FAQ and the whole members'
 * roll to find a button that claimed to be about something else, and pressing it saved
 * everything you had touched on the way.
 *
 * Each section now carries the save for its own fields, and saves *only* those: edits left open
 * elsewhere stay open rather than being committed by a button somebody pressed for another
 * reason. Collapsed to their headings, so the screen opens as six things you can read rather
 * than one you have to scroll.
 */
/**
 * One section of the settings, with the save for its own fields under it.
 *
 * Declared out here rather than inside the component that uses it. A component defined during
 * render is a new type on every render, so React throws the old subtree away and builds a new
 * one — which, in a panel full of text fields, means the cursor leaves the box you are typing
 * in after every single character.
 */
function Section({
  k,
  label,
  summary,
  saveLabel,
  open,
  unsaved,
  saving,
  saved,
  error,
  onToggle,
  onSubmit,
  children,
}: {
  k: SectionKey
  label: string
  summary: string
  saveLabel: string
  open: boolean
  unsaved: boolean
  saving: boolean
  saved: boolean
  error?: string
  onToggle: () => void
  onSubmit: () => void
  children: React.ReactNode
}) {
  return (
    <form
      className={styles.section}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <button
        type="button"
        className={styles.sectionHead}
        aria-expanded={open}
        aria-controls={`section-${k}`}
        onClick={onToggle}
      >
        <span className={styles.sectionName}>{label}</span>
        <span className={styles.sectionNote}>
          {summary}
          {unsaved ? ' · unsaved' : ''}
        </span>
        <span aria-hidden="true" className={open ? styles.chevronOpen : styles.chevron}>
          ⌄
        </span>
      </button>

      {/* Animated by grid rows rather than height, so a section can grow a committee member
          while it is open without anybody having measured anything. */}
      <div id={`section-${k}`} className={open ? styles.bodyOpen : styles.body}>
        <div className={styles.bodyInner}>
          <div className={styles.form}>
            {children}
            <div className={styles.actions}>
              <Button variant="gold" type="submit" size="sm" disabled={saving || !unsaved}>
                {saving ? 'Saving…' : saveLabel}
              </Button>
              {saved && !unsaved ? (
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
          </div>
        </div>
      </div>
    </form>
  )
}

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
    faq: settings.faq.map((row) => ({ ...row })),
    members: [...settings.members],
  }))
  /** Held as typed, so a half-written line does not vanish between keystrokes. */
  const [roll, setRoll] = useState(() => rollToText(settings.members))

  const setRow = (i: number, changes: Partial<(typeof draft.committee)[number]>) =>
    setDraft({ ...draft, committee: draft.committee.map((row, j) => (i === j ? { ...row, ...changes } : row)) })
  const setQuestion = (i: number, changes: Partial<(typeof draft.faq)[number]>) =>
    setDraft({ ...draft, faq: draft.faq.map((row, j) => (i === j ? { ...row, ...changes } : row)) })

  /**
   * What each section owns, and nothing else.
   *
   * `apply` builds what to save: the settings as they are, with this one section's fields taken
   * from the draft. So saving the committee saves the committee — a half-written FAQ answer
   * further down the page stays a half-written FAQ answer, rather than going live because
   * somebody pressed a button about something else.
   */
  const apply: Record<SectionKey, () => SiteSettings> = {
    switches: () => ({ ...settings, ...Object.fromEntries(SWITCH_KEYS.map((k) => [k, draft[k]])) }),
    words: () => ({ ...settings, text: { ...draft.text } }),
    committee: () => ({ ...settings, committee: tidyCommittee(draft.committee) }),
    faq: () => ({ ...settings, faq: tidyFaq(draft.faq) }),
    roll: () => ({ ...settings, members: rollFromText(roll) }),
    home: () => ({ ...settings, home: { ...draft.home } }),
  }

  /** Whether this section has anything unsaved, which is what lights its own Save. */
  const dirty = (k: SectionKey) => JSON.stringify(apply[k]()) !== JSON.stringify(settings)

  const [open, setOpen] = useState<SectionKey[]>(['switches'])
  const [attempted, setAttempted] = useState<SectionKey | null>(null)
  const toggle = (k: SectionKey) => setOpen((now) => (now.includes(k) ? now.filter((x) => x !== k) : [...now, k]))

  const sectionProps = (k: SectionKey) => ({
    k,
    open: open.includes(k),
    unsaved: dirty(k),
    saving: Boolean(saving) && attempted === k,
    saved: Boolean(saved) && attempted === k,
    error: attempted === k ? error : undefined,
    onToggle: () => toggle(k),
    onSubmit: () => {
      setAttempted(k)
      onSave(apply[k]())
    },
  })

  return (
    <div className={styles.sections}>
      <Section {...sectionProps('switches')} label="What the public site shows" summary={`${SWITCH_KEYS.filter((k) => draft[k]).length} of ${SWITCH_KEYS.length} switched on`} saveLabel="Save the switches">
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
      </Section>

      <Section {...sectionProps('words')} label="The words on the public pages" summary={`${SITE_TEXT_KEYS.filter((k) => isPlaceholder(draft.text[k] ?? '')).length} still in brackets`} saveLabel="Save the wording">
        <p className={styles.hint}>
          Only the lines that change. The captions under the theme photographs still live in the
          files — ask a developer for those.
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
      </Section>

      <Section {...sectionProps('committee')} label="The committee" summary={`${tidyCommittee(draft.committee).length} people`} saveLabel="Save the committee">
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
      </Section>

      <Section {...sectionProps('faq')} label="Questions people ask" summary={`${tidyFaq(draft.faq).length} questions`} saveLabel="Save the questions">
        <p className={styles.hint}>
          On the About page, in this order. Anything left in [square brackets] is shown to visitors exactly
          as it appears, so finish a sentence before you save it.
        </p>
        {draft.faq.map((row, i) => (
          <div key={i} className={styles.field}>
            <label className={styles.label} htmlFor={`question-${i}`}>
              Question {i + 1}
            </label>
            <input
              id={`question-${i}`}
              className={styles.input}
              value={row.question}
              onChange={(e) => setQuestion(i, { question: e.target.value })}
            />
            <label className={styles.label} htmlFor={`answer-${i}`} style={{ marginTop: 8 }}>
              Answer {i + 1}
            </label>
            <textarea
              id={`answer-${i}`}
              className={styles.textarea}
              rows={3}
              value={row.answer}
              onChange={(e) => setQuestion(i, { answer: e.target.value })}
            />
            <div className={styles.actions} style={{ marginTop: 6 }}>
              <Button
                variant="line"
                size="sm"
                aria-label={`Remove question ${i + 1}`}
                onClick={() => setDraft({ ...draft, faq: draft.faq.filter((_, j) => j !== i) })}
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
            onClick={() => setDraft({ ...draft, faq: [...draft.faq, { question: '', answer: '' }] })}
          >
            Add a question
          </Button>
        </div>
      </Section>

      <Section {...sectionProps('roll')} label="The members’ roll" summary={`${rollFromText(roll).length} names`} saveLabel="Save the roll">
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
      </Section>

      <Section {...sectionProps('home')} label="Who each part of the home page is for" summary={`${HOME_SECTIONS.length} parts`} saveLabel="Save who sees what">
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
      </Section>

    </div>
  )
}
