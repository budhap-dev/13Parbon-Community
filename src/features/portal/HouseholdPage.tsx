import { useState } from 'react'
import { Link } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { HouseholdForm } from '@/components/HouseholdForm'
import { LoadFailed } from '@/components/LoadFailed'
import { adults, children, householdInitials, householdPhoto } from '@/domain/household'
import { formatDateWithYear } from '@/domain/dates'
import { hasPaid, membershipYearOf, yearLabel } from '@/domain/payments'
import { useHousehold, useUpdateHousehold, useViewer } from '@/lib/api'
import { can } from '@/lib/auth/permissions'
import { useSignedIn } from '@/lib/auth/session'
import { useNow } from '@/lib/clock'
import { Icon } from '@/components/Icon'
import people from './HouseholdPeople.module.css'
import styles from './Portal.module.css'
import { TONES, toneStyle } from './tones'
import { PersonPhoto, PhotoMono } from '@/components/PersonPhoto'

export function HouseholdPage() {
  useDocumentTitle('My household')
  const who = useSignedIn()
  const viewer = useViewer()
  const year = membershipYearOf(useNow())
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

  const paid = household.membership.status === 'active'
  const missing = (value?: string | null) => !value || value.trim().startsWith('[')
  const factOr = (value?: string | null) => (missing(value) ? 'Not given' : value)

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

      {/* The household and its membership as business cards, the same as on the dashboard. */}
      <div className={styles.bizRow}>
        <section className={`${styles.bizCard} ${styles.rise}`} style={toneStyle(0, 'var(--color-accent)')} aria-labelledby="hh-title">
          <div className={styles.bizTop}>
            <div>
              <p className={styles.bizEyebrow}>Household</p>
              <h2 id="hh-title" className={styles.bizName}>
                {household.name}
              </h2>
            </div>
            <PhotoMono photo={householdPhoto(household)} className={styles.bizMono}>
              {householdInitials(household.name)}
            </PhotoMono>
          </div>
          <dl className={styles.bizFactsWide}>
            <div>
              <dt>Main contact</dt>
              <dd>{factOr(household.contactName)}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{factOr(household.email)}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{factOr(household.phone)}</dd>
            </div>
            <div>
              <dt>Signs in with</dt>
              <dd>{factOr(household.googleEmail)}</dd>
            </div>
          </dl>
        </section>

        <section
          className={`${styles.bizCard} ${paid ? styles.bizGood : styles.bizWarn} ${styles.rise}`}
          style={{ '--i': 1 } as React.CSSProperties}
          aria-labelledby="membership-title"
        >
          <div className={styles.bizTop}>
            <div>
              <p className={styles.bizEyebrow}>Membership</p>
              <h2 id="membership-title" className={styles.bizName}>
                {paid ? 'Active' : 'Lapsed'}
              </h2>
            </div>
            <span className={styles.bizChip}>{paid ? 'Paid' : 'Renew'}</span>
          </div>
          <dl className={styles.bizFacts}>
            {household.payments ? (
              <div>
                <dt>{yearLabel(year)}</dt>
                <dd>{hasPaid(household, year) ? 'Paid' : 'Not paid yet'}</dd>
              </div>
            ) : (
              <div>
                <dt>{paid ? 'Runs to' : 'Ran out'}</dt>
                <dd>{household.membership.paidTo ? formatDateWithYear(household.membership.paidTo) : 'Not recorded'}</dd>
              </div>
            )}
            <div>
              <dt>Member since</dt>
              <dd>{formatDateWithYear(household.memberSince)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={`${styles.toneCard} ${styles.rise}`} style={toneStyle(2, TONES[2])} aria-labelledby="people-title">
        <div className={styles.toneHead}>
          <span className={styles.toneIcon} aria-hidden="true">
            <Icon name="users" size={18} />
          </span>
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
            {household.people.map((person, i) => (
              <li key={person.id} className={`${people.person} ${styles.rise} ${styles.lift}`} style={toneStyle(i + 3)}>
                <span className={people.face}>
                  <PersonPhoto person={person} size={54} />
                </span>
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
          <p className={`${styles.muted} ${styles.tiny}`} style={{ marginTop: 14 }}>
            Names are only used to plan seating and the children’s programme. They are never shown publicly, and
            never to another household.
          </p>
        </div>
      </section>

      <section className={`${styles.toneCard} ${styles.rise}`} style={toneStyle(3, TONES[3])} aria-labelledby="help-title">
        <div className={styles.toneHead}>
          <span className={styles.toneIcon} aria-hidden="true">
            <Icon name="heart" size={18} />
          </span>
          <h2 id="help-title" className={styles.panelTitle}>
            Helping out
          </h2>
        </div>
        <div className={styles.pad} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className={`${styles.muted} ${styles.tiny}`}>
            Tell the committee what you would enjoy, and they will ask you first.
          </p>
          {household.interests.length > 0 ? (
            <ul className={styles.toneChips}>
              {household.interests.map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          ) : (
            <p className={`${styles.muted} ${styles.tiny}`}>Nothing listed yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
