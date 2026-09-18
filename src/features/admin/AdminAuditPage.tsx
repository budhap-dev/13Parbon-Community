import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { Button } from '@/components/Button'
import { formatLongDate, formatTime } from '@/domain/dates'
import { useAuditTrail, useViewer } from '@/lib/api'
import { can } from '@/lib/auth/permissions'
import styles from '@/features/portal/Portal.module.css'

/** The table a row happened to, in the words a person would use for it. */
const SUBJECTS: Record<string, string> = {
  households: 'a household',
  people: 'somebody in a household',
  documents: 'a document',
  contact_messages: 'a message',
  event_attendance: 'an attendance count',
  site_settings: 'what the site shows',
  news_posts: 'a news piece',
  announcements: 'a notice',
}

const VERBS: Record<string, string> = { insert: 'Added', update: 'Changed', delete: 'Removed' }

/**
 * The app's own words for the same changes.
 *
 * Two vocabularies reach this screen. A trigger sees a row change and records `update
 * households`; the wrapper around the client records what somebody *meant* — `household:add`,
 * `messages:handle` — because it sits where the intention is known. Against the real database
 * the trigger's lines are the ones read back, so only the first was ever translated, and the
 * committee's walkthrough — which runs on the wrapper — showed rows reading "household:add"
 * with nothing beside them. A screen that teaches somebody the portal should not be the one
 * speaking in slugs. Found by clicking through the walkthrough, 2026-09-18.
 */
const DOING: Record<string, string> = {
  add: 'Added',
  create: 'Added',
  edit: 'Changed',
  save: 'Changed',
  remove: 'Removed',
  delete: 'Removed',
  archive: 'Filed',
  unpublish: 'Took down',
  handle: 'Dealt with',
  record: 'Recorded',
  reorder: 'Reordered',
  setCover: 'Chose the face of',
  caption: 'Captioned',
}

const THINGS: Record<string, string> = {
  household: 'a household',
  album: 'an album',
  announcement: 'a notice',
  attendance: 'an attendance count',
  event: 'an evening',
  media: 'a photograph',
  messages: 'a message',
  news: 'a piece',
  settings: 'what the site shows',
}

/** What happened, in a sentence, whichever half of the app wrote the line. */
export function describeAction(action: string): string {
  if (action.includes(':')) {
    const [thing, doing] = action.split(':')
    // Falls back to the slug rather than to silence: an action nobody has named here should
    // look unfinished, not look like nothing happened.
    return `${DOING[doing] ?? doing} ${THINGS[thing] ?? thing}`.trim()
  }
  const [verb, kind] = action.split(' ')
  return `${VERBS[verb] ?? verb} ${SUBJECTS[kind] ?? kind ?? ''}`.trim()
}

/**
 * What a value looks like in a sentence.
 *
 * Absent has to read as absent rather than as the word "undefined", because half the entries
 * worth reading are somebody filling in a field that was empty.
 */
function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'nothing'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * How much of a value the table prints.
 *
 * A settings row carries the FAQ, the committee list and every word already printed on the
 * pages, as one jsonb value. Printed whole it is a paragraph of JSON in a table cell, and the
 * line either side of it — which is the part somebody came to read — is lost in it. The whole
 * value stays on the row's `title`, so nothing is hidden from anybody who wants it.
 */
const LONGEST = 160
const clamp = (text: string) => (text.length > LONGEST ? `${text.slice(0, LONGEST)}…` : text)

/*
 * A hundred changes is what the trail fetches, and a hundred of these rows is a page somebody
 * scrolls through looking for the one they came for. Twenty is about a screenful.
 *
 * The slicing is here rather than in the query because `audit.list` takes a limit and no offset,
 * and the hundred are already in hand: asking the database again to show rows it has already
 * sent would be a change to the API contract for no answer anybody is waiting on.
 */
const PER_PAGE = 20

export function AdminAuditPage() {
  useDocumentTitle('What has changed')
  const mayRead = can(useViewer(), 'admin:enter')
  const { data: entries, isPending } = useAuditTrail()

  const list = entries ?? []
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  // Clamped rather than stored blindly: a page that empties while somebody is on page five —
  // a refetch, a shorter trail — would otherwise leave them looking at nothing.
  const current = Math.min(page, pages - 1)
  const first = current * PER_PAGE
  const shown = list.slice(first, first + PER_PAGE)
  // Turning a page and staying at the foot of the last one is reading the new page backwards.
  useScrollToTopOn(current)

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>What has changed</h1>
          <p className={styles.sub}>
            Every change to a household, a message, a notice or the site itself — who made it, and what it
            was before.
          </p>
        </div>
      </div>

      <p className={styles.note}>
        Written by the database as each change happens, so nothing reaches the tables without a line here.
        Nobody can edit it, including the committee.
      </p>

      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : list.length === 0 ? (
        <p className={styles.empty}>
          {mayRead
            ? 'Nothing recorded yet. Changes made from these screens will appear here.'
            : 'Only the committee can read this.'}
        </p>
      ) : (
        <section className={styles.panel} aria-labelledby="trail-title">
          <div className={styles.panelHead}>
            <h2 id="trail-title" className={styles.panelTitle}>
              Newest first
            </h2>
            <span className={`${styles.muted} ${styles.tiny}`}>
              {list.length === 1
                ? '1 change'
                : `${first + 1}–${first + shown.length} of ${list.length} changes`}
            </span>
          </div>
          <div className={`${styles.scroll} ${styles.tall}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>What</th>
                  <th>What moved</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((entry) => {
                  const moved = Object.entries(entry.changes)
                  return (
                    <tr key={entry.id}>
                      <td className={styles.tiny}>
                        {formatLongDate(entry.at)}
                        <br />
                        <span className={styles.muted}>{formatTime(entry.at)}</span>
                      </td>
                      {/* The page has always promised this — "who made it, and what it was
                          before" — and the database has always recorded it. It was read out of
                          the database, dropped on the way to the screen, and never shown. */}
                      <td>{entry.actor}</td>
                      <td>
                        <strong>{describeAction(entry.action)}</strong>
                      </td>
                      <td className={`${styles.muted} ${styles.tiny} ${styles.changes}`}>
                        {moved.length === 0 ? (
                          '—'
                        ) : (
                          <ul className={styles.plainList}>
                            {moved.map(([field, change]) => {
                              const was = show(change.from)
                              const now = show(change.to)
                              return (
                                <li key={field} title={`${field}: ${was} → ${now}`}>
                                  {field}: {clamp(was)} → {clamp(now)}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <div className={styles.pager}>
              <span className={`${styles.muted} ${styles.tiny}`}>
                Page {current + 1} of {pages}
              </span>
              <span className={styles.pagerButtons}>
                <Button
                  variant="line"
                  size="sm"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  Newer
                </Button>
                <Button
                  variant="line"
                  size="sm"
                  disabled={current >= pages - 1}
                  onClick={() => setPage(current + 1)}
                >
                  Older
                </Button>
              </span>
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}
