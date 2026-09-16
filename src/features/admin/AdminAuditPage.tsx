import { useDocumentTitle } from '@/app/useDocumentTitle'
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

export function AdminAuditPage() {
  useDocumentTitle('What has changed')
  const mayRead = can(useViewer(), 'admin:enter')
  const { data: entries, isPending } = useAuditTrail()

  const list = entries ?? []

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
              {list.length} {list.length === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>What</th>
                  <th>What moved</th>
                </tr>
              </thead>
              <tbody>
                {list.map((entry) => {
                  const [verb, kind] = entry.action.split(' ')
                  const moved = Object.entries(entry.changes)
                  return (
                    <tr key={entry.id}>
                      <td className={styles.tiny}>
                        {formatLongDate(entry.at)}
                        <br />
                        <span className={styles.muted}>{formatTime(entry.at)}</span>
                      </td>
                      <td>
                        <strong>
                          {VERBS[verb] ?? verb} {SUBJECTS[kind] ?? kind}
                        </strong>
                      </td>
                      <td className={`${styles.muted} ${styles.tiny}`}>
                        {moved.length === 0 ? (
                          '—'
                        ) : (
                          <ul className={styles.plainList}>
                            {moved.map(([field, change]) => (
                              <li key={field}>
                                {field}: {show(change.from)} → {show(change.to)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
