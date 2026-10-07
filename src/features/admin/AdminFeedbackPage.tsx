import { useState } from 'react'
import { useSettings } from '@/app/SettingsContext'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { LoadFailed } from '@/components/LoadFailed'
import { formatLongDate, formatTime } from '@/domain/dates'
import { attributionOf, waiting, type Feedback } from '@/domain/feedback'
import { paragraphs } from '@/domain/news'
import { useAllFeedback, useRemoveFeedback, useReviewFeedback, useViewer } from '@/lib/api'
import { can } from '@/lib/auth/permissions'
import styles from '@/features/portal/Portal.module.css'

const STATUS_WORDS: Record<Feedback['status'], string> = {
  pending: 'Waiting',
  approved: 'On the website',
  rejected: 'Turned down',
}

/**
 * The queue of what the public has sent in.
 *
 * Built as an inbox rather than a table because approving is publishing, and publishing is a
 * thing you do to one piece at a time having read it. A grid of rows with a tick box beside
 * each is a screen that gets swept through in one pass, which is precisely the wrong way to
 * decide what strangers' words go on the community's front page.
 *
 * Turning a piece down leaves it here, marked. Deleting is separate and asks first: it is for
 * what should not be held at all, not for what simply is not for the website.
 */
export function AdminFeedbackPage() {
  useDocumentTitle('Feedback')
  const { data: feedback, isPending, isError, refetch } = useAllFeedback()
  const review = useReviewFeedback()
  const remove = useRemoveFeedback()
  const viewer = useViewer()
  const settings = useSettings()
  const mayReview = can(viewer, 'feedback:review')
  const mayDelete = can(viewer, 'feedback:delete')
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  useOpenFromAddress(feedback, (item) => {
    setOpenId(item.id)
    setConfirming(false)
  })

  const list = feedback ?? []
  const open = list.find((item) => item.id === openId) ?? list[0]
  const unread = waiting(list).length

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Feedback</h1>
          <p className={styles.sub}>
            What the public has sent in. Nothing appears on the website until you approve it here.
          </p>
        </div>
      </div>

      {/*
        Said where the decision is made, not only on the settings screen. Approving something
        while the section is switched off publishes it to a page nobody can reach, and the
        reviewer would have no way of knowing.
      */}
      {!settings.showFeedback ? (
        <p className={styles.note}>
          <strong>The feedback page is switched off.</strong> People cannot send anything and nothing
          approved here is visible to anybody. Turn it on under Content → Site switches when the
          committee is ready.
        </p>
      ) : null}

      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : isError ? (
        <LoadFailed what="the feedback" onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <p className={styles.empty}>Nothing has come in yet.</p>
      ) : (
        <div className={styles.two}>
          <section className={styles.panel} aria-labelledby="queue-title">
            <div className={styles.panelHead}>
              <h2 id="queue-title" className={styles.panelTitle}>
                Queue
              </h2>
              <span className={`${styles.muted} ${styles.tiny}`}>{unread} waiting</span>
            </div>
            <ul className={styles.list}>
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.listItem}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 0,
                      color: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setOpenId(item.id)
                      setConfirming(false)
                    }}
                    aria-current={item.id === open?.id ? 'true' : undefined}
                  >
                    {item.status === 'pending' ? <span className={styles.dot} /> : null}
                    <span className={styles.listBody}>
                      <strong>
                        {attributionOf(item)}
                        {item.signedIn ? ' ✓' : ''}
                      </strong>
                      <span className={`${styles.muted} ${styles.tiny}`}>
                        {formatLongDate(item.createdAt)} · {STATUS_WORDS[item.status]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {open ? (
            <section className={styles.panel} aria-labelledby="open-title">
              <div className={styles.panelHead}>
                <div>
                  <h2 id="open-title" className={styles.panelTitle}>
                    {attributionOf(open)}
                  </h2>
                  <p className={`${styles.muted} ${styles.tiny}`} style={{ marginTop: 4 }}>
                    {formatLongDate(open.createdAt)}, {formatTime(open.createdAt)} ·{' '}
                    {STATUS_WORDS[open.status]}
                    {open.reviewedBy ? ` by ${open.reviewedBy}` : ''}
                  </p>
                </div>
              </div>
              <div className={styles.pad} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/*
                  What a signed piece is actually worth saying out loud. The name came from the
                  Google account, not from a box somebody typed into — which is the whole reason
                  to offer signing in, and worth stating where the decision is being made.
                */}
                <p className={styles.note}>
                  {open.signedIn ? (
                    <>
                      <strong>Signed in with Google.</strong> The name above came from their account,
                      so it is not something they could have typed. We hold no address for them —
                      the contact page is where somebody goes who wants a reply.
                    </>
                  ) : (
                    <>
                      <strong>Sent anonymously.</strong> Nothing was kept about who wrote it. Read it
                      on its own terms: there is nobody to check it with.
                    </>
                  )}
                </p>

                {paragraphs(open.message).map((text, i) => (
                  <p key={i} style={{ maxWidth: '60ch', lineHeight: 1.65 }}>
                    {text}
                  </p>
                ))}

                <div className={styles.actions}>
                  {open.status === 'approved' ? (
                    <Button
                      variant="line"
                      size="sm"
                      disabled={!mayReview || review.isPending}
                      onClick={() => review.mutate({ id: open.id, status: 'pending' })}
                    >
                      Take off the website
                    </Button>
                  ) : (
                    <Button
                      variant="gold"
                      size="sm"
                      disabled={!mayReview || review.isPending}
                      onClick={() => review.mutate({ id: open.id, status: 'approved' })}
                    >
                      <Icon name="check" size={15} />
                      {review.isPending ? 'Publishing…' : 'Approve and publish'}
                    </Button>
                  )}
                  {open.status === 'rejected' ? null : (
                    <Button
                      variant="line"
                      size="sm"
                      disabled={!mayReview || review.isPending}
                      onClick={() => review.mutate({ id: open.id, status: 'rejected' })}
                    >
                      Turn down
                    </Button>
                  )}
                  {mayDelete ? (
                    <Button variant="danger" size="sm" disabled={remove.isPending} onClick={() => setConfirming(true)}>
                      <Icon name="trash" size={15} />
                      Delete
                    </Button>
                  ) : null}
                </div>

                <ConfirmDialog
                  open={confirming}
                  title="Delete this feedback?"
                  confirmLabel="Delete"
                  busyLabel="Deleting…"
                  busy={remove.isPending}
                  // In the dialog, which stays open when it fails: behind it, nobody would see it.
                  error={remove.isError ? `That did not delete. ${remove.error.message}` : undefined}
                  onCancel={() => {
                    setConfirming(false)
                    remove.reset()
                  }}
                  onConfirm={() =>
                    remove.mutate(open.id, {
                      onSuccess: () => {
                        setConfirming(false)
                        // Whatever is left is the next thing to read, chosen by the list.
                        setOpenId(null)
                      },
                    })
                  }
                >
                  It goes for good, and the words are not kept anywhere — the trail records only that
                  you deleted a piece and when it came in. This is for something that should not be
                  held at all. To keep it off the website but keep the record, turn it down instead.
                </ConfirmDialog>

                {review.isError ? (
                  <p className={`${styles.muted} ${styles.tiny}`} role="alert">
                    That did not save. {review.error.message}
                  </p>
                ) : null}
                <p className={`${styles.muted} ${styles.tiny}`}>
                  Approved feedback shows this name and the date, and nothing else.
                </p>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
