import { forDateTimeInput, fromDateTimeInput } from '@/domain/dates'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import {
  ANNOUNCEMENT_MAX,
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

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => React.ReactNode
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-')
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {}),
      })}
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

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
  const [errors, setErrors] = useState<ContentErrors>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateNews(draft)
    setErrors(found)
    if (isValid(found)) onSave(draft)
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label="Title" error={errors.title}>
        {(p) => (
          <input {...p} className={styles.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        )}
      </Field>

      <Field label="One line for the list" hint="What somebody reads before deciding to open it." error={errors.excerpt}>
        {(p) => (
          <input
            {...p}
            className={styles.input}
            value={draft.excerpt}
            onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
          />
        )}
      </Field>

      <Field label="The piece" hint="Leave a blank line between paragraphs. That is all the formatting there is." error={errors.body}>
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
        <Field label="Written by" error={errors.author}>
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
  const [errors, setErrors] = useState<ContentErrors>({})
  const left = ANNOUNCEMENT_MAX - draft.body.trim().length

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateAnnouncement(draft)
    setErrors(found)
    if (isValid(found)) onSave(draft)
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label="Notice" error={errors.title}>
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
