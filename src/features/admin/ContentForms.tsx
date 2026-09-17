import { forDateTimeInput, fromDateTimeInput } from '@/domain/dates'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import {
  ANNOUNCEMENT_MAX,
  EXCERPT_MIN,
  PIECE_MAX,
  PIECE_MIN,
  TITLE_MAX,
  TITLE_MIN,
  isValid,
  validateAnnouncement,
  validateNews,
  type Announcement,
  type AnnouncementDraft,
  type ContentErrors,
  type NewsDraft,
  type NewsPost,
} from '@/domain/news'
import styles from './ContentForms.module.css'

// forInput used to slice the ISO string, which relabels UTC as local and moves every date by
// the offset. See forDateTimeInput in domain/dates.

export function newsDraftOf(post?: NewsPost): NewsDraft {
  return {
    title: post?.title ?? '',
    excerpt: post?.excerpt ?? '',
    body: post?.body ?? '',
    tags: post?.tags ?? [],
    author: post?.author ?? '',
    published: post ? Boolean(post.publishedAt) && !post.hidden : false,
  }
}

export function announcementDraftOf(announcement?: Announcement): AnnouncementDraft {
  return {
    title: announcement?.title ?? '',
    body: announcement?.body ?? '',
    pinned: announcement?.pinned ?? false,
    audience: announcement?.audience ?? 'public',
    publishAt: announcement?.publishAt ?? '',
    expiresAt: announcement?.expiresAt ?? '',
    link: announcement?.link,
  }
}

/**
 * The refusals to show, of those the form has actually made.
 *
 * `refused` is what the last press of the button objected to; `now` is what is wrong at this
 * moment. Showing the overlap means two things. A red line goes as soon as the thing it
 * objected to has been put right, rather than sitting under a box that is now perfectly good
 * until somebody presses the button again — which is what it did, and it reads as a form that
 * has stopped listening. And nothing new appears while somebody is still typing: a box they
 * have not reached yet is not a mistake.
 *
 * The message comes from `now` rather than from `refused`, so a field that has gone from too
 * short to too long says the thing that is true of it.
 */
function outstanding(refused: ContentErrors, now: ContentErrors): ContentErrors {
  return Object.fromEntries(
    Object.keys(refused)
      .filter((field) => now[field])
      .map((field) => [field, now[field]]),
  )
}

function Field({
  label,
  hint,
  error,
  need,
  children,
}: {
  label: string
  hint?: string
  error?: string
  /**
   * The shortest this field may be, and what is in it.
   *
   * Shown only once somebody has started and while they are still short of it. The rules were
   * invisible until then: you wrote a piece, pressed Write it, and were told the body was too
   * thin — which is a poor moment to learn a rule, and no help at all in knowing how much more.
   * The noticeboard's "N characters left" has done this from the start; this is the same idea
   * from the other end.
   *
   * Not announced while it is empty, because a form that opens covered in what it will refuse
   * reads as a telling-off before anybody has typed anything.
   */
  need?: { value: string; min: number; max?: number }
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => React.ReactNode
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-')
  const written = need ? need.value.trim().length : 0
  const short = need ? written > 0 && written < need.min : false
  /*
   * The far end, and only once it is in sight. A running count under a box with two hundred
   * characters of room is noise for the first hundred and eighty of them; what is wanted is a
   * word before the wall, and the truth after it.
   */
  const room = need?.max !== undefined ? need.max - written : null
  const warnFrom = need?.max !== undefined ? Math.max(25, Math.round(need.max / 10)) : 0
  const nearTheEnd = room !== null && room <= warnFrom
  // Everything under the box, in the order it is read, so the field carries its own rules for
  // anybody who cannot see them sitting there.
  const describedBy = [
    hint ? `${id}-hint` : '',
    short || nearTheEnd ? `${id}-need` : '',
    error ? `${id}-error` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {short || nearTheEnd ? (
        <p id={`${id}-need`} className={styles.hint}>
          {short
            ? `${written} of ${need!.min} characters so far.`
            : room! >= 0
              ? `${room} characters left of ${need!.max}.`
              : `${-room!} over the ${need!.max} allowed.`}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * What the committee has actually had to write, offered to somebody looking at a blank box.
 *
 * Prompts, not templates. Nothing here goes into a field: a form that fills itself in is how
 * "[DATE]" ended up on the live site, sitting in a piece nobody had finished. These say what a
 * piece could be about and leave the writing to the person writing.
 */
const IDEAS = [
  'How an evening went, while people still remember it',
  'Thank you to the people who cooked, decorated and cleared up',
  'What to expect at the next programme, so nobody has to ask',
  'A change of venue, date or time that wants more than a line on the noticeboard',
  'Something the committee has decided, and why',
]

/**
 * Writing a piece.
 *
 * A textarea, and no more than that. The body is plain paragraphs — `paragraphs()` splits it on
 * blank lines — so a rich-text editor would be a way of producing markup nothing renders.
 */
export function NewsForm({
  post,
  onSave,
  onCancel,
  saving,
  error,
}: {
  post?: NewsPost
  onSave: (draft: NewsDraft) => void
  onCancel: () => void
  saving?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<NewsDraft>(() => newsDraftOf(post))
  const [refused, setRefused] = useState<ContentErrors>({})
  const errors = outstanding(refused, validateNews(draft))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateNews(draft)
    setRefused(found)
    if (isValid(found)) onSave(draft)
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {/* Only on a blank one. Somebody editing has already decided what it is about. */}
      {!post ? (
        <div className={styles.ideas}>
          <p className={styles.ideasTitle}>Not sure what to write?</p>
          <ul className={styles.ideasList}>
            {IDEAS.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
          <p className={styles.hint} style={{ marginTop: 8 }}>
            If it is one sentence and it stops being true next week, it is a notice rather than a
            piece — the noticeboard is the other tab.
          </p>
        </div>
      ) : null}

      <Field label="Title" error={errors.title} need={{ value: draft.title, min: TITLE_MIN, max: TITLE_MAX }}>
        {(p) => (
          <input {...p} className={styles.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        )}
      </Field>

      <Field
        label="One line for the list"
        hint="What somebody reads before deciding to open it."
        error={errors.excerpt}
        need={{ value: draft.excerpt, min: EXCERPT_MIN }}
      >
        {(p) => (
          <input
            {...p}
            className={styles.input}
            value={draft.excerpt}
            onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
          />
        )}
      </Field>

      <Field
        label="The piece"
        hint="Leave a blank line between paragraphs. That is all the formatting there is."
        error={errors.body}
        need={{ value: draft.body, min: PIECE_MIN, max: PIECE_MAX }}
      >
        {(p) => (
          <textarea
            {...p}
            className={styles.textarea}
            rows={14}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        )}
      </Field>

      <div className={styles.row}>
        <Field label="Written by" error={errors.author} need={{ value: draft.author, min: 2 }}>
          {(p) => (
            <input
              {...p}
              className={styles.input}
              value={draft.author}
              onChange={(e) => setDraft({ ...draft, author: e.target.value })}
            />
          )}
        </Field>

        <Field label="Tags" hint="Separated by commas.">
          {(p) => (
            <input
              {...p}
              className={styles.input}
              value={draft.tags.join(', ')}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((x) => x.trim()) })}
            />
          )}
        </Field>
      </div>

      <div className={styles.check}>
        <input
          id="published"
          type="checkbox"
          checked={draft.published}
          aria-describedby="published-note"
          onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
        />
        <span>
          <label htmlFor="published">On the website</label>
          <span id="published-note" className={styles.hint}>
            Off keeps it here as a draft. Taking a published piece off later keeps both the writing and
            the date it first went up.
          </span>
        </span>
      </div>

      <div className={styles.actions}>
        <Button variant="gold" type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : post ? 'Save' : 'Write it'}
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
  )
}

/**
 * Posting a notice.
 *
 * Short by design. The story is firm that this never competes with WhatsApp for attention, so
 * the box counts down and says what a long one wants to be instead.
 */
export function AnnouncementForm({
  announcement,
  onSave,
  onCancel,
  saving,
  error,
}: {
  announcement?: Announcement
  onSave: (draft: AnnouncementDraft) => void
  onCancel: () => void
  saving?: boolean
  error?: string
}) {
  const [draft, setDraft] = useState<AnnouncementDraft>(() => announcementDraftOf(announcement))
  const [refused, setRefused] = useState<ContentErrors>({})
  const errors = outstanding(refused, validateAnnouncement(draft))
  const left = ANNOUNCEMENT_MAX - draft.body.trim().length

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateAnnouncement(draft)
    setRefused(found)
    if (isValid(found)) onSave(draft)
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label="Notice" error={errors.title} need={{ value: draft.title, min: TITLE_MIN, max: TITLE_MAX }}>
        {(p) => (
          <input {...p} className={styles.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        )}
      </Field>

      <Field
        label="What is happening"
        hint={left >= 0 ? `${left} characters left.` : `${-left} over. Anything this long wants to be a news post.`}
        error={errors.body}
      >
        {(p) => (
          <textarea
            {...p}
            className={styles.textarea}
            rows={4}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        )}
      </Field>

      <div className={styles.row}>
        <Field label="Show from" hint="Leave empty to put it up now.">
          {(p) => (
            <input
              {...p}
              type="datetime-local"
              className={styles.input}
              value={forDateTimeInput(draft.publishAt)}
              onChange={(e) => setDraft({ ...draft, publishAt: fromDateTimeInput(e.target.value) })}
            />
          )}
        </Field>

        <Field label="Take down on" hint="Leave empty and it stays until removed." error={errors.expiresAt}>
          {(p) => (
            <input
              {...p}
              type="datetime-local"
              className={styles.input}
              value={forDateTimeInput(draft.expiresAt)}
              onChange={(e) => setDraft({ ...draft, expiresAt: fromDateTimeInput(e.target.value) })}
            />
          )}
        </Field>
      </div>

      <Field label="Who sees it">
        {(p) => (
          <select
            {...p}
            className={styles.input}
            value={draft.audience}
            onChange={(e) => setDraft({ ...draft, audience: e.target.value as AnnouncementDraft['audience'] })}
          >
            <option value="public">Anybody — it goes on the website</option>
            <option value="members">Members only — in the portal, after signing in</option>
          </select>
        )}
      </Field>

      <div className={styles.check}>
        <input
          id="pinned"
          type="checkbox"
          checked={draft.pinned}
          aria-describedby="pinned-note"
          onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
        />
        <span>
          <label htmlFor="pinned">Keep it at the top</label>
          <span id="pinned-note" className={styles.hint}>
            Pin the one thing that matters most. Pin everything and nothing is pinned.
          </span>
        </span>
      </div>

      <div className={styles.actions}>
        <Button variant="gold" type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : announcement ? 'Save' : 'Put it up'}
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
  )
}
