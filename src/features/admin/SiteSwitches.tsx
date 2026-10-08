import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ActionBar } from '@/components/ActionBar'
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
import {
  paragraphsFromText,
  paragraphsToText,
  storyFromText,
  storyToText,
  tidyFestivals,
  tidyPrivacySections,
  tidySocial,
  tidyThemePhotos,
  tidyTools,
  tidyValues,
  webAddressOr,
  isWebAddress,
  type SiteTheme,
} from '@/domain/siteContent'
import { defaultSettings } from '@/app/defaults'
import { isPlaceholder } from '@/app/site'
import { themes } from '@/app/theme/themes'
import { useNow } from '@/lib/clock'
import {
  CollageEditor,
  FestivalEditor,
  OrderEditor,
  PrivacyEditor,
  SocialEditor,
  ToolsEditor,
  ValuesEditor,
  type PrivacyRow,
} from './SettingsEditors'
import styles from './ContentForms.module.css'
import { isSectionKey, SITE_SECTIONS, type SectionKey } from './siteSections'


const AUDIENCES: { value: SectionAudience; label: string }[] = [
  { value: 'public', label: 'Anybody' },
  { value: 'members', label: 'Members, once signed in' },
  { value: 'admins', label: 'The committee only' },
]

/** The date a notice took effect, as the privacy page prints it: 21 September 2026. */
const longDate = (when: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }).format(when)

const privacyRowsOf = (sections: SiteSettings['privacy']['sections']): PrivacyRow[] =>
  sections.map((section) => ({ title: section.title, text: paragraphsToText(section.body) }))

const SWITCH_KEYS = Object.keys(SETTING_LABELS) as (keyof typeof SETTING_LABELS)[]

/**
 * A good many unrelated jobs, and each one saves on its own.
 *
 * It was six. It is now everything about the site that the committee owns and a developer used
 * to edit for them — the festivals, the story, the channels, the privacy notice — grouped by
 * the page each one changes, because "where is the thing that changes the About page?" is the
 * question somebody arrives with.
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
  lazy,
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
  /**
   * Whether to leave the fields undrawn until the section is first opened.
   *
   * The lists are heavy — a festival is four boxes and three buttons, and there are eight such
   * lists — and with all of them drawn, every keystroke anywhere on the screen redrew several
   * hundred fields nobody was looking at. Once opened a section stays drawn, so closing it
   * again does not throw away what was typed into it.
   */
  lazy?: boolean
  onToggle: () => void
  onSubmit: () => void
  children: React.ReactNode
}) {
  const [drawn, setDrawn] = useState(open || !lazy)
  if (open && !drawn) setDrawn(true)
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
        id={`section-head-${k}`}
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
            <ActionBar
              status={
                error ? (
                  <span className={styles.error} role="alert">
                    {error}
                  </span>
                ) : saved && !unsaved ? (
                  <span className={styles.hint} role="status">
                    Saved. The site changes for everybody straight away.
                  </span>
                ) : null
              }
            >
              <Button variant="gold" type="submit" size="sm" disabled={saving || !unsaved}>
                {saving ? 'Saving…' : saveLabel}
              </Button>
            </ActionBar>
            {drawn ? children : null}
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
    homeOrder: [...settings.homeOrder],
    social: settings.social.map((row) => ({ ...row })),
    festivals: settings.festivals.map((row) => ({ ...row })),
    values: settings.values.map((row) => ({ ...row })),
    collage: { ...settings.collage, photos: settings.collage.photos.map((row) => ({ ...row })) },
    tools: settings.tools.map((row) => ({ ...row })),
  }))
  /** Held as typed, so a half-written line does not vanish between keystrokes. */
  const [roll, setRoll] = useState(() => rollToText(settings.members))
  /** The story as one box of text, for the same reason and because it is pasted in whole. */
  const [story, setStory] = useState(() => storyToText(settings.story))
  const [privacyRows, setPrivacyRows] = useState<PrivacyRow[]>(() => privacyRowsOf(settings.privacy.sections))
  const [controller, setController] = useState(settings.privacy.controller)
  /** "Ours is still right": said about a notice the developer has since rewritten. */
  const [keepOurs, setKeepOurs] = useState(false)
  const now = useNow()

  /*
   * The developer's notice, and whether ours was written before it.
   *
   * The privacy notice is the one piece of wording here that has to be true about the code:
   * it says what the site collects. When the site changes, the notice in the files is rewritten
   * and its date moves on — and a notice saved from this screen would carry on being shown
   * over the top of it. So the saved one remembers which version it was edited from, and when
   * that is no longer the version in the files, this says so rather than leaving it to luck.
   */
  const codeNotice = defaultSettings.privacy
  const noticeIsBehind = settings.privacy.basedOn !== codeNotice.updatedOn

  const privacyToSave = (): SiteSettings => {
    const was = settings.privacy
    const sections = tidyPrivacySections(
      privacyRows.map((row) => ({ title: row.title, body: paragraphsFromText(row.text) })),
    )
    const responsible = controller.trim() || was.controller
    const same = JSON.stringify(sections) === JSON.stringify(was.sections) && responsible === was.controller
    // A notice with nothing in it is not saved, and neither is one nobody has touched.
    if (sections.length === 0 || (same && !(keepOurs && noticeIsBehind))) return settings
    return {
      ...settings,
      privacy: {
        // The date moves only when the words do. Saying "ours is still right" is not a change.
        updatedOn: same ? was.updatedOn : longDate(now),
        controller: responsible,
        basedOn: codeNotice.updatedOn,
        sections,
      },
    }
  }

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
    look: () => ({ ...settings, defaultTheme: draft.defaultTheme }),
    words: () => ({ ...settings, text: { ...draft.text } }),
    social: () => ({
      ...settings,
      social: tidySocial(draft.social),
      volunteerFormUrl: webAddressOr(draft.volunteerFormUrl),
    }),
    home: () => ({ ...settings, home: { ...draft.home }, homeOrder: [...draft.homeOrder] }),
    festivals: () => ({ ...settings, festivals: tidyFestivals(draft.festivals) }),
    story: () => ({ ...settings, story: storyFromText(story) }),
    values: () => ({ ...settings, values: tidyValues(draft.values) }),
    committee: () => ({ ...settings, committee: tidyCommittee(draft.committee) }),
    roll: () => ({ ...settings, members: rollFromText(roll) }),
    faq: () => ({ ...settings, faq: tidyFaq(draft.faq) }),
    collage: () => ({
      ...settings,
      collage: {
        // A collage with no name is one a screen reader announces as nothing, so a blanked
        // label keeps the one it had.
        label: draft.collage.label.trim() || settings.collage.label,
        credit: draft.collage.credit.trim(),
        photos: tidyThemePhotos(draft.collage.photos),
      },
    }),
    privacy: privacyToSave,
    tools: () => ({ ...settings, tools: tidyTools(draft.tools) }),
  }

  /** Whether this section has anything unsaved, which is what lights its own Save. */
  const asSaved = JSON.stringify(settings)
  const dirty = (k: SectionKey) => JSON.stringify(apply[k]()) !== asSaved

  const [open, setOpen] = useState<SectionKey[]>(['switches'])
  const [attempted, setAttempted] = useState<SectionKey | null>(null)
  const toggle = (k: SectionKey) => setOpen((now) => (now.includes(k) ? now.filter((x) => x !== k) : [...now, k]))

  /*
   * `?section=` opens one section and brings it into view: how the portal's search lands on
   * "The year's festivals" rather than at the top of a page of fourteen closed ones. Taken out of
   * the address once done, the same as `?open=` elsewhere, so closing the section stays closed.
   */
  const [params, setParams] = useSearchParams()
  const asked = params.get('section')
  // Opened while rendering, the moment the address asks, so the section is already drawn by the
  // time the effect below goes looking for it.
  const [answered, setAnswered] = useState<string | null>(null)
  if (asked !== answered) {
    setAnswered(asked)
    if (asked && isSectionKey(asked) && !open.includes(asked)) setOpen([...open, asked])
  }
  useEffect(() => {
    if (!asked) return
    if (isSectionKey(asked)) {
      const head = document.getElementById(`section-head-${asked}`)
      head?.scrollIntoView?.({ block: 'start' })
      head?.focus({ preventScroll: true })
    }
    setParams(
      (now) => {
        const next = new URLSearchParams(now)
        next.delete('section')
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }, [asked, setParams])

  /** The sections added when the lists left the files. See `lazy` on `Section`. */
  const LAZY: SectionKey[] = ['look', 'social', 'festivals', 'story', 'values', 'collage', 'privacy', 'tools']

  const sectionProps = (k: SectionKey) => ({
    k,
    lazy: LAZY.includes(k),
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
      <h3 className={styles.groupTitle}>The whole site</h3>
      <Section {...sectionProps('switches')} label={SITE_SECTIONS.switches} summary={`${SWITCH_KEYS.filter((k) => draft[k]).length} of ${SWITCH_KEYS.length} switched on`} saveLabel="Save the switches">
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

      <Section {...sectionProps('look')} label={SITE_SECTIONS.look} summary={themes.find((t) => t.id === draft.defaultTheme)?.name ?? ''} saveLabel="Save the colours">
        <div className={styles.field}>
          <label className={styles.label} htmlFor="defaultTheme">
            The season’s look
          </label>
          <select
            id="defaultTheme"
            className={styles.input}
            value={draft.defaultTheme}
            aria-describedby="defaultTheme-note"
            onChange={(e) => setDraft({ ...draft, defaultTheme: e.target.value as SiteTheme })}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name} — {theme.description}
              </option>
            ))}
          </select>
          <p id="defaultTheme-note" className={styles.hint}>
            What somebody sees on a first visit. Anybody who has picked their own colours from the
            palette in the header keeps them — including you, so if nothing seems to change here,
            that is why.
          </p>
        </div>
      </Section>

      <Section {...sectionProps('words')} label={SITE_SECTIONS.words} summary={`${SITE_TEXT_KEYS.filter((k) => isPlaceholder(draft.text[k] ?? '')).length} still in brackets`} saveLabel="Save the wording">
        <p className={styles.hint}>
          The single lines. Anything that is a list — the festivals, the story, the channels, the
          theme’s photographs — has a section of its own on this page.
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

      <Section {...sectionProps('social')} label={SITE_SECTIONS.social} summary={`${tidySocial(draft.social).length} channels`} saveLabel="Save the channels">
        <p className={styles.hint}>
          In the footer of every page and on the contact page, in this order. The footer draws only
          the ones with an address.
        </p>
        <SocialEditor rows={draft.social} onChange={(social) => setDraft({ ...draft, social })} />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="volunteerFormUrl">
            Form for offers to help
          </label>
          <input
            id="volunteerFormUrl"
            className={styles.input}
            inputMode="url"
            placeholder="https://"
            value={draft.volunteerFormUrl}
            aria-invalid={draft.volunteerFormUrl.trim() !== '' && !isWebAddress(draft.volunteerFormUrl) ? true : undefined}
            aria-describedby="volunteerFormUrl-note"
            onChange={(e) => setDraft({ ...draft, volunteerFormUrl: e.target.value })}
          />
          <p id="volunteerFormUrl-note" className={styles.hint}>
            Where the Volunteer button on an event’s page goes — a Google Form, say. Empty, or
            anything that is not a web address, sends people to the contact page instead.
          </p>
        </div>
      </Section>

      <h3 className={styles.groupTitle}>The home page</h3>

      <Section {...sectionProps('home')} label={SITE_SECTIONS.home} summary={`${draft.homeOrder.length} parts`} saveLabel="Save the home page">
        <p className={styles.hint}>
          The order they come in, between the name at the top and the invitation at the bottom.
          A part that is switched off or has nothing to show takes up no room wherever it is.
        </p>
        <OrderEditor order={draft.homeOrder} onChange={(homeOrder) => setDraft({ ...draft, homeOrder })} />
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

      <Section {...sectionProps('festivals')} label={SITE_SECTIONS.festivals} summary={`${tidyFestivals(draft.festivals).length} festivals`} saveLabel="Save the festivals">
        <p className={styles.hint}>
          “Our year” on the home page and the filter on the Events page, in this order. To mark one
          as next up, choose it on the evening itself, under Events. Removing a festival does not
          remove its evenings — they simply stop being filed under anything.
        </p>
        <FestivalEditor rows={draft.festivals} onChange={(festivals) => setDraft({ ...draft, festivals })} />
      </Section>


      <h3 className={styles.groupTitle}>The About page</h3>

      <Section {...sectionProps('story')} label={SITE_SECTIONS.story} summary={`${storyFromText(story).length} paragraphs, headings and lists`} saveLabel="Save the story">
        <div className={styles.field}>
          <label className={styles.label} htmlFor="story">
            The story, as it reads on the About page
          </label>
          <textarea
            id="story"
            className={styles.textarea}
            rows={18}
            value={story}
            aria-describedby="story-note"
            onChange={(e) => setStory(e.target.value)}
          />
          <p id="story-note" className={styles.hint}>
            Leave an empty line between paragraphs. Start a line with # to make it a heading, and
            with - to make it one of a list. Emptied completely, the story and its heading come
            off the page.
          </p>
        </div>
      </Section>

      <Section {...sectionProps('values')} label={SITE_SECTIONS.values} summary={`${tidyValues(draft.values).length} values`} saveLabel="Save the values">
        <p className={styles.hint}>
          The cards under the story. One with no heading or no sentence is left out rather than
          shown half-finished.
        </p>
        <ValuesEditor rows={draft.values} onChange={(values) => setDraft({ ...draft, values })} />
      </Section>

      <Section {...sectionProps('committee')} label={SITE_SECTIONS.committee} summary={`${tidyCommittee(draft.committee).length} people`} saveLabel="Save the committee">
        <p className={styles.hint}>
          As shown on the About page, in this order — which is not a ranking. It changes at the AGM
          every year, which is exactly the sort of thing that should not need a developer.
        </p>
        <ActionBar sticky={false}>
          <Button
            variant="line"
            size="sm"
            onClick={() => setDraft({ ...draft, committee: [...draft.committee, { role: '', name: '' }] })}
          >
            Add somebody
          </Button>
        </ActionBar>
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
      </Section>

      <Section {...sectionProps('roll')} label={SITE_SECTIONS.roll} summary={`${rollFromText(roll).length} names`} saveLabel="Save the roll">
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

      <Section {...sectionProps('faq')} label={SITE_SECTIONS.faq} summary={`${tidyFaq(draft.faq).length} questions`} saveLabel="Save the questions">
        <p className={styles.hint}>
          On the About page, in this order. Anything left in [square brackets] is shown to visitors exactly
          as it appears, so finish a sentence before you save it.
        </p>
        <ActionBar sticky={false}>
          <Button
            variant="line"
            size="sm"
            onClick={() => setDraft({ ...draft, faq: [...draft.faq, { question: '', answer: '' }] })}
          >
            Add a question
          </Button>
        </ActionBar>
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
      </Section>

      <h3 className={styles.groupTitle}>Events</h3>

      <Section {...sectionProps('collage')} label={SITE_SECTIONS.collage} summary={`${draft.collage.photos.length} photographs`} saveLabel="Save the photographs">
        <p className={styles.hint}>
          The black-and-white-into-colour collage on the page of any evening that has a theme. The
          theme’s own words are set on the evening, under Events; these are the pictures behind it.
          Taking one out of this list takes it off the page, but does not delete the file.
        </p>
        <CollageEditor value={draft.collage} onChange={(collage) => setDraft({ ...draft, collage })} />
      </Section>

      <h3 className={styles.groupTitle}>Small print, and the portal</h3>

      <Section {...sectionProps('privacy')} label={SITE_SECTIONS.privacy} summary={`Last updated ${settings.privacy.updatedOn}`} saveLabel="Save the notice">
        <p className={styles.hint}>
          This is a promise about what the site does with people’s details, so it has to stay true.
          Change the wording freely; do not say the site collects less than it does. The date at the
          top of the notice moves to today whenever the words change.
        </p>
        {noticeIsBehind ? (
          <div className={styles.warning} role="alert">
            <p style={{ margin: 0 }}>
              <strong>The site has changed since this notice was written.</strong> The developer’s
              version is dated {codeNotice.updatedOn}, and yours was edited from an earlier one —
              so what the site collects may no longer be what this says. Read theirs, then choose.
            </p>
            <div className={styles.actions} style={{ marginTop: 10 }}>
              <Button
                variant="line"
                size="sm"
                onClick={() => {
                  setPrivacyRows(privacyRowsOf(codeNotice.sections))
                  setController(codeNotice.controller)
                }}
              >
                Start again from the developer’s version
              </Button>
              <Button variant="line" size="sm" onClick={() => setKeepOurs(true)}>
                Ours is still right
              </Button>
            </div>
          </div>
        ) : null}
        <PrivacyEditor rows={privacyRows} controller={controller} onRows={setPrivacyRows} onController={setController} />
        {tidyPrivacySections(privacyRows.map((row) => ({ title: row.title, body: paragraphsFromText(row.text) }))).length === 0 ? (
          <p className={styles.error}>
            A notice needs at least one section with a heading and something under it, so this
            cannot be saved as it is.
          </p>
        ) : (
          <p className={styles.hint}>One paragraph to a line under each heading.</p>
        )}
      </Section>

      <Section {...sectionProps('tools')} label={SITE_SECTIONS.tools} summary={`${tidyTools(draft.tools).length} linked`} saveLabel="Save the tools">
        <p className={styles.hint}>
          Links in the portal’s sidebar, shown to the committee only. The first one is the planner
          the Events screen points at. The addresses themselves are stored with the rest of the
          site’s settings, which anybody can read if they go looking — so link only to things that
          ask for a sign-in of their own.
        </p>
        <ToolsEditor rows={draft.tools} onChange={(tools) => setDraft({ ...draft, tools })} />
      </Section>

    </div>
  )
}
