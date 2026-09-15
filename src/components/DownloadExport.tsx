import { useState } from 'react'
import { Button } from './Button'
import { exportFilename, type HouseholdExport } from '@/domain/subjectAccess'
import styles from './DownloadExport.module.css'

/**
 * Hands a household everything the app holds about them.
 *
 * Two forms, because they answer two different needs. What is on screen is meant to be read —
 * somebody asking "what do you hold about us?" has been fobbed off, not answered, if the reply
 * is a file of JSON. The file is there so they can keep it, or take it somewhere else.
 */
export function DownloadExport({
  data,
  loading,
  onAsk,
  error,
}: {
  data?: HouseholdExport
  loading?: boolean
  onAsk: () => void
  error?: string
}) {
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportFilename(data.household, data.takenAt)
    link.click()
    // Revoked on the next turn of the loop: the click has to have been handled first.
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setSaved(true)
  }

  if (!data) {
    return (
      <div className={styles.ask}>
        <Button variant="line" size="sm" onClick={onAsk} disabled={loading}>
          {loading ? 'Gathering…' : 'Show me everything you hold'}
        </Button>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const { household, registrations, messages, signInAttempts, changes, notes } = data

  return (
    <div className={styles.report}>
      <dl className={styles.lines}>
        <Line label="Household" value={household.name} />
        <Line label="Main contact" value={household.contactName} />
        <Line label="Email" value={household.email} />
        <Line label="Phone" value={household.phone ?? 'Not given'} />
        <Line label="Signs in with" value={household.googleEmail ?? 'No address recorded'} />
        <Line label="Member since" value={household.memberSince} />
        <Line
          label="Membership"
          value={`${household.membership.status === 'active' ? 'Active' : 'Lapsed'}${
            household.membership.paidTo ? `, paid to ${household.membership.paidTo}` : ''
          }`}
        />
        <Line label="Role" value={household.role === 'admin' ? 'Committee' : 'Member'} />
        <Line
          label="In the directory"
          value={
            household.listedInDirectory
              ? `Yes — showing ${[household.shareEmail && 'email', household.sharePhone && 'phone'].filter(Boolean).join(' and ') || 'name only'}`
              : 'No'
          }
        />
      </dl>

      <Group title={`People (${household.people.length})`}>
        <ul className={styles.list}>
          {household.people.map((person) => (
            <li key={person.id}>
              <strong>{person.name}</strong> — {person.ageGroup === 'adult' ? 'adult' : `child, age ${person.age}`}
              {person.note ? <span className={styles.note}> · “{person.note}”</span> : null}
            </li>
          ))}
        </ul>
      </Group>

      <Group title={`Events you were recorded at (${registrations.length})`}>
        {registrations.length === 0 ? (
          <p className={styles.note}>None recorded.</p>
        ) : (
          <ul className={styles.list}>
            {registrations.map((r) => (
              <li key={r.id}>
                {r.eventId} — {r.adults} {r.adults === 1 ? 'adult' : 'adults'}
                {r.children > 0 ? `, ${r.children} children` : ''}
                {r.helping ? ` · helping with ${r.helping}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Group>

      <Group title={`Messages you sent us (${messages.length})`}>
        {messages.length === 0 ? (
          <p className={styles.note}>None found.</p>
        ) : (
          <ul className={styles.list}>
            {messages.map((m) => (
              <li key={m.id}>
                <strong>{m.subject}</strong> <span className={styles.note}>· {m.createdAt.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </Group>

      {signInAttempts.length > 0 ? (
        <Group title="Times you tried to sign in before we had your address">
          <ul className={styles.list}>
            {signInAttempts.map((a) => (
              <li key={a.email}>
                {a.email} — {a.attempts} {a.attempts === 1 ? 'try' : 'tries'}, last on {a.lastTriedAt.slice(0, 10)}
              </li>
            ))}
          </ul>
        </Group>
      ) : null}

      <Group title={`Changes recorded to your record (${changes.length})`}>
        {changes.length === 0 ? (
          <p className={styles.note}>None recorded.</p>
        ) : (
          <ul className={styles.list}>
            {changes.map((c, i) => (
              <li key={i}>
                {c.at.slice(0, 10)} — {c.fields.join(', ')}
              </li>
            ))}
          </ul>
        )}
        <p className={styles.note}>
          We do not show which committee member made a change. That is a fact about them rather than
          about you.
        </p>
      </Group>

      {notes.map((note) => (
        <p key={note} className={styles.note}>
          {note}
        </p>
      ))}

      <div className={styles.ask}>
        <Button variant="gold" size="sm" onClick={save}>
          Save it as a file
        </Button>
        {saved ? (
          <span className={styles.note} role="status">
            Saved to your downloads.
          </span>
        ) : null}
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.line}>
      <dt className={styles.dt}>{label}</dt>
      <dd className={styles.dd}>{value}</dd>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      {children}
    </section>
  )
}
