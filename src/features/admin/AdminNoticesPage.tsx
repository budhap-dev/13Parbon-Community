import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadFailed } from '@/components/LoadFailed'
import { formatLongDate } from '@/domain/dates'
import { isLive, type Announcement } from '@/domain/news'
import { useAllAnnouncements, useCreateAnnouncement, useRemoveAnnouncement, useUpdateAnnouncement } from '@/lib/api'
import { useNow } from '@/lib/clock'
import styles from '@/features/portal/Portal.module.css'
import { AnnouncementForm } from './ContentForms'

/**
 * The noticeboard: the hall shut on Saturday, the puja moved an hour.
 *
 * A screen of its own. It was a tab of Content, beside the site's wording and its switches —
 * but a notice is the one thing the committee puts up most weeks, and it should be one press
 * from the sidebar rather than a screen and a tab away.
 */
export function AdminNoticesPage() {
  useDocumentTitle('Noticeboard')
  const noticesQuery = useAllAnnouncements()
  const announcements = noticesQuery.data
  const createNotice = useCreateAnnouncement()
  const updateNotice = useUpdateAnnouncement()
  const removeNotice = useRemoveAnnouncement()
  // Read once per render: the same instant should decide every row, or a notice could read as
  // both waiting and finished in one table.
  const at = useNow().toISOString()

  /**
   * What just happened, said out loud.
   *
   * Putting a notice up closed the form and returned you to the list, and that was the whole of
   * the feedback: no word that it had saved, and nothing about where it had gone. A notice for
   * members and a notice that starts next Tuesday both look exactly like one that is on the
   * website this second.
   */
  const [posted, setPosted] = useState<string | null>(null)
  /*
   * Which notice is being asked about.
   *
   * Unlike a news piece, which is unpublished and keeps its writing, a notice is deleted
   * outright: there is no version of it worth keeping once it stops being true. So taking one
   * off asks first.
   */
  const [removing, setRemoving] = useState<string | null>(null)
  /** The form, when it is open: a new notice, or one being edited. */
  const [editing, setEditing] = useState<{ notice?: Announcement } | null>(null)
  // Opening or leaving the form replaces the page without changing the address.
  useScrollToTopOn(editing)
  // `?open=` names a notice, from the portal's search.
  useOpenFromAddress(
    announcements?.map((notice) => ({ id: notice.id, notice })),
    (item) => {
      setPosted(null)
      setEditing({ notice: item.notice })
    },
  )

  const whereItWent = (notice: Announcement): string => {
    const where = notice.audience === 'public' ? 'on the website' : 'in the portal, to members'
    if (notice.publishAt > at) return `Saved. It goes up ${where} on ${formatLongDate(notice.publishAt)}.`
    if (notice.expiresAt && notice.expiresAt <= at) return 'Saved — but the take-down date has already passed, so nobody will see it.'
    return `Up now, ${where}.`
  }
  const done = (notice: Announcement) => {
    setPosted(whereItWent(notice))
    setEditing(null)
  }

  if (editing) {
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>{editing.notice ? 'Edit the notice' : 'Put up a notice'}</h1>
            <p className={styles.sub}>Short, and few. A noticeboard people can read at a glance is the whole point of it.</p>
          </div>
          <span className={styles.actions}>
            <Button variant="line" size="sm" onClick={() => setEditing(null)}>
              Back to the list
            </Button>
          </span>
        </div>
        <section className={styles.panel}>
          <div className={styles.pad}>
            <AnnouncementForm
              announcement={editing.notice}
              saving={createNotice.isPending || updateNotice.isPending}
              error={createNotice.isError ? createNotice.error.message : updateNotice.isError ? updateNotice.error.message : undefined}
              onCancel={() => setEditing(null)}
              onSave={(draft) =>
                editing.notice
                  ? updateNotice.mutate({ id: editing.notice.id, draft }, { onSuccess: done })
                  : createNotice.mutate(draft, { onSuccess: done })
              }
            />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Noticeboard</h1>
          <p className={styles.sub}>Short notices for this week: on the home page, or to members in the portal.</p>
        </div>
      </div>

      {posted ? (
        <p className={styles.said} role="status">
          {posted}
        </p>
      ) : null}

      <section className={styles.panel} aria-labelledby="notices-title">
        <div className={styles.panelHead}>
          <h2 id="notices-title" className={styles.panelTitle}>
            The noticeboard
          </h2>
          <Button variant="line" size="sm" onClick={() => setEditing({})}>
            Put up a notice
          </Button>
        </div>
        {noticesQuery.isPending ? (
          <p className={styles.empty} aria-busy="true">
            Loading…
          </p>
        ) : noticesQuery.isError ? (
          <div className={styles.pad}>
            <LoadFailed what="the notices" onRetry={() => void noticesQuery.refetch()} />
          </div>
        ) : !announcements?.length ? (
          <p className={styles.empty}>Nothing on the board.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Who sees it</th>
                  <th>Showing</th>
                  <th className={styles.right}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((notice) => (
                  <tr key={notice.id}>
                    <td>
                      <strong>{notice.pinned ? '📌 ' : ''}{notice.title}</strong>
                      <br />
                      <span className={`${styles.muted} ${styles.tiny}`}>{notice.body}</span>
                    </td>
                    <td className={styles.muted}>{notice.audience === 'public' ? 'Anybody' : 'Members'}</td>
                    <td>
                      <span className={isLive(notice, at) ? styles.pillLive : styles.pillWait}>
                        {isLive(notice, at) ? 'On the board' : notice.publishAt > at ? 'Waiting' : 'Finished'}
                      </span>
                    </td>
                    <td className={styles.right}>
                      <span className={`${styles.actions} ${styles.actionsRight}`}>
                        <Button
                          variant="line"
                          size="sm"
                          aria-label={`Edit ${notice.title}`}
                          onClick={() => setEditing({ notice })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          aria-label={`Take ${notice.title} off the board`}
                          onClick={() => setRemoving(notice.id)}
                        >
                          Take off
                        </Button>
                        <ConfirmDialog
                          open={removing === notice.id}
                          title="Take this notice off the board?"
                          confirmLabel="Take it off"
                          busyLabel="Removing…"
                          busy={removeNotice.isPending}
                          error={removeNotice.isError ? removeNotice.error.message : undefined}
                          onCancel={() => setRemoving(null)}
                          onConfirm={() =>
                            removeNotice.mutate(notice.id, {
                              onSuccess: () => {
                                setRemoving(null)
                                setPosted('Taken off the board. A notice has no version worth keeping, so it is gone.')
                              },
                            })
                          }
                        >
                          <strong>{notice.title}</strong> goes for good. A notice has no version worth
                          keeping, so there is nothing to put back.
                        </ConfirmDialog>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.pad} style={{ paddingTop: 14 }}>
          <p className={styles.note}>
            A notice taken off the board is gone — there is no version of it worth keeping once it has
            stopped being true. A news piece is different: that is unpublished, and the writing stays.
          </p>
        </div>
      </section>
    </div>
  )
}
