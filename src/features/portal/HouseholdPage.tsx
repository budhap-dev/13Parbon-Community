import { useState } from 'react'
import { Link } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { HouseholdForm } from '@/components/HouseholdForm'
import { LoadFailed } from '@/components/LoadFailed'
import { adults, children } from '@/domain/household'
import { formatDateWithYear } from '@/domain/dates'
import { useHousehold, useUpdateHousehold, useViewer } from '@/lib/api'
import { can } from '@/lib/auth/permissions'
import { useSignedIn } from '@/lib/auth/session'
import { PersonAvatar } from '@/components/PersonAvatar'
import people from './HouseholdPeople.module.css'
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

export function HouseholdPage() {
  useDocumentTitle('My household')
  const who = useSignedIn()
  const viewer = useViewer()
  const { data: household, isPending, isError, refetch } = useHousehold(who?.householdId)
  const save = useUpdateHousehold()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  // Before isPending: with no household to ask for, the query never runs, and a query that
  // never runs stays pending for ever.
  if (!who?.householdId) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>My household</h1>
        <p className={styles.note}>
          <strong>This account is not linked to a household yet.</strong> The committee can link it for you —{' '}
          <Link to="/contact" className={styles.inlineLink}>
            ask them
          </Link>{' '}
          and they will sort it out.
        </p>
      </div>
    )
  }
  if (isPending) return <p aria-busy="true">Loading…</p>
  if (isError) return <LoadFailed what="your household" onRetry={() => void refetch()} />
  if (!household) return <p className={styles.empty}>We could not find your household.</p>

  const mayEdit = can(viewer, 'household:edit', { householdId: household.id })

  if (editing) {
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>Edit your household</h1>
            <p className={styles.sub}>
              Change what the committee holds about you, and what other members can see. Your
              membership and how you sign in are the committee's to change — ask them.
            </p>
          </div>
          <Button variant="line" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
        <section className={styles.panel}>
          <div className={styles.pad}>
            <HouseholdForm
              household={household}
              viewer={viewer}
              saving={save.isPending}
              error={save.isError ? save.error.message : undefined}
              onSave={(draft) =>
                save.mutate(
                  { id: household.id, draft },
                  {
                    onSuccess: () => {
                      setEditing(false)
                      setSaved(true)
                    },
                  },
                )
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
          <h1 className={styles.title}>My household</h1>
          <p className={styles.sub}>What the committee holds about you, and what other members can see.</p>
        </div>
        {mayEdit ? (
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setSaved(false)
              setEditing(true)
            }}
          >
            Edit
          </Button>
        ) : null}
      </div>

      {saved ? (
        <p className={styles.note} role="status">
          Saved.
        </p>
      ) : null}

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
            <div className={styles.pad}>
              <ul className={people.people}>
                {household.people.map((person) => (
                  <li key={person.id} className={people.person}>
                    <PersonAvatar person={person} />
                    <div className={people.words}>
                      <span className={people.name}>{person.name}</span>
                      <span className={people.who}>
                        <span className={people.tag}>{person.ageGroup === 'adult' ? 'Adult' : 'Child'}</span>
                        {person.ageGroup === 'child' && person.age !== undefined ? `${person.age} years old` : null}
                      </span>
                      {person.note ? <span className={people.note}>{person.note}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
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
