import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { formatLongDate, formatTime } from '@/domain/dates'
import { paragraphs } from '@/domain/news'
import { TAKEDOWN_PROMISE } from '@/domain/contact'
import { useContactMessages, useDeleteMessage, useMarkMessageHandled, useViewer } from '@/lib/api'
import { can } from '@/lib/auth/permissions'
import styles from '@/features/portal/Portal.module.css'

export function AdminMessagesPage() {
  useDocumentTitle('Messages')
  const { data: messages, isPending } = useContactMessages()
  const markHandled = useMarkMessageHandled()
  const removeMessage = useDeleteMessage()
  const viewer = useViewer()
  const mayHandle = can(viewer, 'messages:handle')
  const mayDelete = can(viewer, 'messages:delete')
  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)

  const list = messages ?? []
  const open = list.find((m) => m.id === openId) ?? list[0]
  const unread = list.filter((m) => !m.handledBy).length
  const waitingPhotos = list.filter((m) => m.kind === 'photo' && !m.handledBy).length

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Messages</h1>
          <p className={styles.sub}>Everything sent through the contact form on the website.</p>
        </div>
      </div>

      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : list.length === 0 ? (
        <p className={styles.empty}>No messages yet.</p>
      ) : (
        <div className={styles.two}>
          <section className={styles.panel} aria-labelledby="inbox-title">
            <div className={styles.panelHead}>
              <h2 id="inbox-title" className={styles.panelTitle}>
                Inbox
              </h2>
              <span className={`${styles.muted} ${styles.tiny}`}>
                {unread} unread
                {waitingPhotos > 0
                  ? ` · ${waitingPhotos} ${waitingPhotos === 1 ? 'photograph' : 'photographs'} to take down`
                  : ''}
              </span>
            </div>
            <ul className={styles.list}>
              {list.map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    className={styles.listItem}
                    style={{ width: '100%', background: 'transparent', border: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => {
                      setOpenId(message.id)
                      setConfirming(false)
                    }}
                    aria-current={message.id === open?.id ? 'true' : undefined}
                  >
                    {message.handledBy ? null : <span className={styles.dot} />}
                    <span className={styles.listBody}>
                      <strong>
                        {message.kind === 'photo' ? '📷 ' : ''}
                        {message.subject}
                      </strong>
                      <span className={`${styles.muted} ${styles.tiny}`}>
                        {message.name} · {formatLongDate(message.createdAt)}
                        {message.handledBy ? ` · handled by ${message.handledBy}` : ''}
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
                    {open.subject}
                  </h2>
                  <p className={`${styles.muted} ${styles.tiny}`} style={{ marginTop: 4 }}>
                    {open.name} · {open.email} · {formatLongDate(open.createdAt)}, {formatTime(open.createdAt)}
                  </p>
                </div>
              </div>
              <div className={styles.pad} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {paragraphs(open.message).map((text, i) => (
                  <p key={i} style={{ maxWidth: '60ch', lineHeight: 1.65 }}>
                    {text}
                  </p>
                ))}
                {open.kind === 'photo' && !open.handledBy ? (
                  <div className={styles.pad} style={{ padding: 0 }}>
                    <p className={styles.note}>
                      <strong>Somebody wants a photograph taken down.</strong> We said {TAKEDOWN_PROMISE}.
                      Take it out of the album on the Photographs page first — deleting there really
                      deletes it — then say here what you did.
                    </p>
                    <label className={`${styles.label}`} htmlFor="handled-note" style={{ display: 'block', marginTop: 12 }}>
                      What happened to the photograph
                    </label>
                    <input
                      id="handled-note"
                      className={styles.input}
                      value={note}
                      placeholder="Deleted boishakhi-2026-14 from the album"
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                ) : null}
                {open.handledNote ? (
                  <p className={`${styles.muted} ${styles.tiny}`}>What was done: {open.handledNote}</p>
                ) : null}
                <div className={styles.actions}>
                  <Button variant="gold" size="sm" href={`mailto:${open.email}`}>
                    Reply by email
                  </Button>
                  {mayDelete ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={removeMessage.isPending}
                      onClick={() => setConfirming(true)}
                    >
                      <Icon name="trash" size={15} />
                      Delete
                    </Button>
                  ) : null}
                  <Button
                    variant="line"
                    size="sm"
                    disabled={
                      !mayHandle ||
                      Boolean(open.handledBy) ||
                      markHandled.isPending ||
                      // A takedown cannot be marked done until somebody says what was done.
                      (open.kind === 'photo' && !note.trim())
                    }
                    onClick={() => markHandled.mutate({ id: open.id, note }, { onSuccess: () => setNote('') })}
                  >
                    {open.handledBy ? 'Handled' : markHandled.isPending ? 'Marking…' : 'Mark handled'}
                  </Button>
                </div>
                <ConfirmDialog
                  open={confirming}
                  title="Delete this message?"
                  confirmLabel="Delete"
                  busyLabel="Deleting…"
                  busy={removeMessage.isPending}
                  onCancel={() => setConfirming(false)}
                  onConfirm={() =>
                    removeMessage.mutate(open.id, {
                      onSuccess: () => {
                        setConfirming(false)
                        // Whatever is left is the next thing to read, chosen by the list.
                        setOpenId(null)
                      },
                    })
                  }
                >
                  It goes for good, and it is the only record the committee holds of what was asked
                  {open.kind === 'photo' ? ', including that a photograph was asked about' : ''}. A line
                  stays in the audit trail saying you deleted it. To keep it and clear the unread count,
                  mark it handled instead.
                </ConfirmDialog>
                {removeMessage.isError ? (
                  <p className={`${styles.muted} ${styles.tiny}`} role="alert">
                    That did not delete. {removeMessage.error.message}
                  </p>
                ) : null}
                {markHandled.isError ? (
                  <p className={`${styles.muted} ${styles.tiny}`} role="alert">
                    That did not save. {markHandled.error.message}
                  </p>
                ) : null}
                <p className={`${styles.muted} ${styles.tiny}`}>
                  Replies go from your own email, so the visitor sees a person rather than a no-reply address.
                </p>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
