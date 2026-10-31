import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { Button } from '@/components/Button'
import { LoadFailed } from '@/components/LoadFailed'
import { formatStamp } from '@/domain/dates'
import { useAuditTrail, useSignIns, useViewer } from '@/lib/api'
import { can } from '@/lib/auth/permissions'
import styles from '@/features/portal/Portal.module.css'
import { changeLines } from './auditChanges'

/** The table a row happened to, in the words a person would use for it. */
const SUBJECTS: Record<string, string> = {
  households: 'a household',
  people: 'somebody in a household',
  membership_payments: 'a membership payment',
  documents: 'a document',
  contact_messages: 'a message',
  event_attendance: 'an attendance count',
  site_settings: 'what the site shows',
  news_posts: 'a news piece',
  announcements: 'a notice',
  feedback: 'a piece of feedback',
  polls: 'a poll',
  quizzes: 'a quiz',
  quiz_questions: 'a quiz question',
  suggestions: 'a member’s suggestion',
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
  publish: 'Put on the website',
  decline: 'Turned down',
  withdraw: 'Took off the website',
  approve: 'Used',
  reopen: 'Put back in the queue',
}

const THINGS: Record<string, string> = {
  household: 'a household',
  payment: 'a membership payment',
  album: 'an album',
  announcement: 'a notice',
  attendance: 'an attendance count',
  event: 'an evening',
  media: 'a photograph',
  messages: 'a message',
  news: 'a piece',
  settings: 'what the site shows',
  feedback: 'a piece of feedback',
  poll: 'a poll',
  quiz: 'a quiz',
  question: 'a quiz question',
  suggestion: 'a member’s suggestion',
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

/** The whole of a value, for the row's title: nothing is hidden from somebody who wants it. */
const whole = (value: unknown) => (value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''))

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

type Tab = 'changes' | 'sign-ins'

/**
 * Two tabs: what changed, and who signed in.
 *
 * Sign-ins are not changes, so they are not lines in the trail. Mixed in, a committee signing in
 * every evening would push the edits somebody came looking for off the end of the list; and the
 * two are kept for different lengths of time — the trail for good, the sign-ins for ninety days.
 */
export function AdminAuditPage() {
  useDocumentTitle('What has changed')
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'sign-ins' ? 'sign-ins' : 'changes'
  const showTab = (next: Tab) =>
    setParams(
      (now) => {
        const after = new URLSearchParams(now)
        if (next === 'changes') after.delete('tab')
        else after.set('tab', next)
        return after
      },
      { replace: true, preventScrollReset: true },
    )

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>What has changed</h1>
          <p className={styles.sub}>
            {tab === 'changes'
              ? 'Every change, who made it, and what it was before.'
              : 'Who has signed in to the portal, and when, over the last ninety days.'}
          </p>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="History">
        {(
          [
            ['changes', 'Changes'],
            ['sign-ins', 'Sign-ins'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            className={tab === key ? styles.tabOn : styles.tab}
            onClick={() => showTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className={styles.page}>
        {tab === 'changes' ? <ChangesPanel /> : <SignInsPanel />}
      </div>
    </div>
  )
}

/**
 * Twenty rows at a time, from a list already in hand.
 *
 * Clamped rather than stored blindly: a page that empties while somebody is on page five — a
 * refetch, a shorter list — would otherwise leave them looking at nothing.
 */
function usePages<T>(list: T[]) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const current = Math.min(page, pages - 1)
  const first = current * PER_PAGE
  // Turning a page and staying at the foot of the last one is reading the new page backwards.
  useScrollToTopOn(current)
  return { shown: list.slice(first, first + PER_PAGE), first, current, pages, setPage }
}

function Pager({ current, pages, setPage }: { current: number; pages: number; setPage: (page: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className={styles.pager}>
      <span className={`${styles.muted} ${styles.tiny}`}>
        Page {current + 1} of {pages}
      </span>
      <span className={styles.pagerButtons}>
        <Button variant="line" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
          Newer
        </Button>
        <Button variant="line" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
          Older
        </Button>
      </span>
    </div>
  )
}

function SignInsPanel() {
  const mayRead = can(useViewer(), 'admin:enter')
  const { data, isPending, isError, refetch } = useSignIns()
  const list = data ?? []
  const { shown, first, current, pages, setPage } = usePages(list)

  return (
    <>
      <p className={styles.note}>
        Recorded by the site each time somebody with a household signs in with Google, and kept for
        ninety days. Addresses that are not on the list are on the People screen instead.
      </p>
      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : isError && mayRead ? (
        <LoadFailed what="the sign-ins" onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <p className={styles.empty}>
          {mayRead ? 'Nobody has signed in in the last ninety days.' : 'Only the committee can read this.'}
        </p>
      ) : (
        <section className={styles.panel} aria-labelledby="sign-ins-title">
          <div className={styles.panelHead}>
            <h2 id="sign-ins-title" className={styles.panelTitle}>
              Newest first
            </h2>
            <span className={`${styles.muted} ${styles.tiny}`}>
              {list.length === 1 ? '1 sign-in' : `${first + 1}–${first + shown.length} of ${list.length} sign-ins`}
            </span>
          </div>
          <div className={`${styles.scroll} ${styles.tall}`}>
            <table className={`${styles.table} ${styles.cardsOnPhone}`}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Signed in with</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((signIn) => (
                  <tr key={signIn.id}>
                    <td data-label="When" className={`${styles.tiny} ${styles.nowrap}`}>
                      <time dateTime={signIn.at}>{formatStamp(signIn.at)}</time>
                    </td>
                    <td data-label="Who">{signIn.who}</td>
                    <td data-label="Signed in with" className={`${styles.muted} ${styles.tiny}`} style={{ overflowWrap: 'anywhere' }}>
                      {signIn.address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager current={current} pages={pages} setPage={setPage} />
        </section>
      )}
    </>
  )
}

function ChangesPanel() {
  const mayRead = can(useViewer(), 'admin:enter')
  const { data: entries, isPending, isError, refetch } = useAuditTrail()
  const list = entries ?? []
  const { shown, first, current, pages, setPage } = usePages(list)

  return (
    <>
      <p className={styles.note}>
        The site writes this down by itself as each change happens, so nothing changes without a line
        here. Nobody can edit it, including the committee.
      </p>
      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : isError && mayRead ? (
        <LoadFailed what="the trail" onRetry={() => void refetch()} />
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
            <table className={`${styles.table} ${styles.cardsOnPhone}`}>
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
                      <td data-label="When" className={`${styles.tiny} ${styles.nowrap}`}>
                        <time dateTime={entry.at}>{formatStamp(entry.at)}</time>
                      </td>
                      {/* The page has always promised this — "who made it, and what it was
                          before" — and the database has always recorded it. It was read out of
                          the database, dropped on the way to the screen, and never shown. */}
                      <td data-label="Who">
                        {entry.actor}
                        {/* The address too, so the name can be checked: it is what they signed in with. */}
                        {entry.actorAddress && !entry.actor.startsWith(entry.actorAddress) ? (
                          <span className={`${styles.muted} ${styles.tiny}`} style={{ display: 'block', overflowWrap: 'anywhere' }}>
                            {entry.actorAddress}
                          </span>
                        ) : null}
                      </td>
                      <td data-label="What">
                        <strong>{describeAction(entry.action)}</strong>
                      </td>
                      <td data-label="What moved" className={`${styles.muted} ${styles.tiny} ${styles.changes} ${styles.wideOnPhone}`}>
                        {moved.length === 0 ? (
                          '—'
                        ) : (
                          <ul className={styles.plainList}>
                            {moved.flatMap(([field, change]) =>
                              changeLines(field, change.from, change.to).map((line) => (
                                <li key={`${field}:${line.label}`} title={`${field}: ${whole(change.from)} → ${whole(change.to)}`}>
                                  {line.label}: {clamp(line.was)} → {clamp(line.now)}
                                </li>
                              )),
                            )}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pager current={current} pages={pages} setPage={setPage} />
        </section>
      )}
    </>
  )
}
