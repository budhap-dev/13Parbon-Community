import { useDocumentTitle } from '@/app/useDocumentTitle'
import { adults, children } from '@/domain/household'
import { formatDateWithYear } from '@/domain/dates'
import { useHousehold } from '@/lib/api'
import { useSignedIn } from '@/lib/auth/session'
import styles from './Portal.module.css'

function Field({ label, value }: { label: string; value?: string }) {
  const missing = !value || value.trim().startsWith('[')
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={missing ? styles.valueEmpty : styles.value}>{missing ? 'Not given' : value}</span>
    </div>
  )
}

function Toggle({ on, title, note }: { on: boolean; title: string; note: string }) {
  return (
    <div className={styles.rowBetween}>
      <div>
        <strong>{title}</strong>
        <p className={`${styles.muted} ${styles.tiny}`}>{note}</p>
      </div>
      <span className={on ? styles.switchOn : styles.switch} role="img" aria-label={on ? `${title}: on` : `${title}: off`}>
        <span className={styles.knob} />
      </span>
    </div>
  )
}

export function HouseholdPage() {
  useDocumentTitle('My household')
  const who = useSignedIn()
  const { data: household, isPending } = useHousehold(who?.householdId)

  if (isPending) return <p aria-busy="true">Loading…</p>
  if (!household) return <p className={styles.empty}>We could not find your household.</p>

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>My household</h1>
          <p className={styles.sub}>What the committee holds about you, and what other members can see.</p>
        </div>
      </div>

      <div className={styles.two}>
        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="hh-title">
            <div className={styles.panelHead}>
              <h2 id="hh-title" className={styles.panelTitle}>
                Household
              </h2>
            </div>
            <div className={`${styles.pad} ${styles.grid2}`}>
              <Field label="Household name" value={household.name} />
              <Field label="Main contact" value={household.contactName} />
              <Field label="Email" value={household.email} />
              <Field label="Phone" value={household.phone} />
              <Field label="Signs in with" value={household.googleEmail ?? undefined} />
              <Field label="Member since" value={formatDateWithYear(household.memberSince)} />
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="people-title">
            <div className={styles.panelHead}>
              <h2 id="people-title" className={styles.panelTitle}>
                Who is in the household
              </h2>
              <span className={`${styles.muted} ${styles.tiny}`}>
                {adults(household)} {adults(household) === 1 ? 'adult' : 'adults'}
                {children(household) > 0 ? `, ${children(household)} under 18` : ''}
              </span>
            </div>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age group</th>
                    <th>Notes for organisers</th>
                  </tr>
                </thead>
                <tbody>
                  {household.people.map((person) => (
                    <tr key={person.id}>
                      <td>
                        <strong>{person.name}</strong>
                      </td>
                      <td className={styles.muted}>
                        {person.ageGroup === 'adult' ? 'Adult' : `Child${person.age ? `, ${person.age}` : ''}`}
                      </td>
                      <td className={`${styles.muted} ${styles.tiny}`}>{person.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pad} style={{ paddingTop: 14 }}>
              <p className={`${styles.muted} ${styles.tiny}`}>
                Names are only used to plan seating and the children’s programme. They are never shown publicly, and
                never to another household.
              </p>
            </div>
          </section>
        </div>

        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="privacy-title">
            <div className={styles.panelHead}>
              <h2 id="privacy-title" className={styles.panelTitle}>
                What other members see
              </h2>
            </div>
            <div className={styles.pad} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Toggle
                on={household.listedInDirectory}
                title="List us in the directory"
                note="Other signed-in members can find your household."
              />
              <Toggle on={household.shareEmail} title="Show our email" note="So members can reach you directly." />
              <Toggle on={household.sharePhone} title="Show our phone" note="Off by default." />
              <p className={styles.note}>Nothing here is ever public. The directory is only visible after signing in.</p>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="help-title">
            <div className={styles.panelHead}>
              <h2 id="help-title" className={styles.panelTitle}>
                Helping out
              </h2>
            </div>
            <div className={styles.pad} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className={`${styles.muted} ${styles.tiny}`}>
                Tell the committee what you would enjoy, and they will ask you first.
              </p>
              {household.interests.length > 0 ? (
                <ul className={styles.chips}>
                  {household.interests.map((interest) => (
                    <li key={interest} className={styles.pill}>
                      {interest}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`${styles.muted} ${styles.tiny}`}>Nothing listed yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
