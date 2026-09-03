import { Link } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { directoryEntry } from '@/domain/household'
import { useDirectory, useHouseholds } from '@/lib/api'
import { useSignedIn } from '@/lib/auth/session'
import styles from './Portal.module.css'

export function DirectoryPage() {
  useDocumentTitle('Directory')
  const who = useSignedIn()
  const { data: listed, isPending } = useDirectory()
  const { data: all } = useHouseholds()

  const entries = (listed ?? []).map(directoryEntry).filter((e) => e !== null)
  const total = all?.length

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Directory</h1>
          <p className={styles.sub}>Households who chose to be listed. Members only, never public.</p>
        </div>
      </div>

      <p className={styles.note}>
        {total ? `${entries.length} of ${total} households have chosen to appear here. ` : ''}
        You decide whether yours does, in <Link to="/portal/household">My household</Link>.
      </p>

      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : entries.length === 0 ? (
        <p className={styles.empty}>Nobody has chosen to be listed yet.</p>
      ) : (
        <section className={styles.panel} aria-labelledby="az-title">
          <div className={styles.panelHead}>
            <h2 id="az-title" className={styles.panelTitle}>
              A to Z
            </h2>
            <span className={`${styles.muted} ${styles.tiny}`}>
              {entries.length} {entries.length === 1 ? 'household' : 'households'}
            </span>
          </div>
          <ul className={`${styles.pad} ${styles.cards}`}>
            {entries.map((entry) => {
              const isYou = entry.id === who?.householdId
              return (
                <li key={entry.id} className={isYou ? styles.cardYou : styles.card}>
                  <span className={styles.cardName}>
                    {entry.name}
                    {isYou ? <span className={styles.pillWait}>You</span> : null}
                  </span>
                  <span className={`${styles.muted} ${styles.tiny}`}>
                    {entry.contactName} · {entry.size}
                  </span>
                  {entry.email ? (
                    <a href={`mailto:${entry.email}`} className={styles.tiny}>
                      {entry.email}
                    </a>
                  ) : (
                    <span className={`${styles.muted} ${styles.tiny}`}>Contact details not shared</span>
                  )}
                  {entry.phone ? <span className={styles.tiny}>{entry.phone}</span> : null}
                  {entry.interests.length > 0 ? (
                    <ul className={styles.chips} style={{ marginTop: 6 }}>
                      {entry.interests.map((interest) => (
                        <li key={interest} className={styles.pill}>
                          {interest}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
