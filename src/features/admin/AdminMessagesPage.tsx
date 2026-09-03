import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { formatLongDate, formatTime } from '@/domain/dates'
import { paragraphs } from '@/domain/news'
import { useContactMessages } from '@/lib/api'
import styles from '@/features/portal/Portal.module.css'

export function AdminMessagesPage() {
  useDocumentTitle('Messages')
  const { data: messages, isPending } = useContactMessages()
  const [openId, setOpenId] = useState<string | null>(null)

  const list = messages ?? []
  const open = list.find((m) => m.id === openId) ?? list[0]
  const unread = list.filter((m) => !m.handledBy).length

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
              <span className={`${styles.muted} ${styles.tiny}`}>{unread} unread</span>
            </div>
            <ul className={styles.list}>
              {list.map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    className={styles.listItem}
                    style={{ width: '100%', background: 'transparent', border: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => setOpenId(message.id)}
                    aria-current={message.id === open?.id ? 'true' : undefined}
                  >
                    {message.handledBy ? null : <span className={styles.dot} />}
                    <span className={styles.listBody}>
                      <strong>{message.subject}</strong>
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
                <div className={styles.actions}>
                  <Button variant="gold" size="sm" href={`mailto:${open.email}`}>
                    Reply by email
                  </Button>
                  <Button variant="line" size="sm" onClick={() => {}}>
                    {open.handledBy ? 'Handled' : 'Mark handled'}
                  </Button>
                </div>
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
