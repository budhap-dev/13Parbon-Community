import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { formatLongDate } from '@/domain/dates'
import { describeSize } from '@/domain/household'
import { useHouseholds, useSignInAttempts } from '@/lib/api'
import { useSignedIn } from '@/lib/auth/session'
import styles from '@/features/portal/Portal.module.css'

export function AdminPeoplePage() {
  useDocumentTitle('People')
  const who = useSignedIn()
  const { data: households, isPending } = useHouseholds()
  const { data: attempts } = useSignInAttempts()

  const neverSignedIn = households?.filter((h) => !h.googleEmail).length ?? 0

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>People</h1>
          <p className={styles.sub}>
            Membership is by invitation. Add the households the committee knows, and decide who can act for the
            committee.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => {}}>
          Add a household
        </Button>
      </div>

      {attempts && attempts.length > 0 ? (
        <section className={styles.panel} aria-labelledby="attempts-title">
          <div className={styles.panelHead}>
            <h2 id="attempts-title" className={styles.panelTitle}>
              Tried to sign in, not on the list
            </h2>
            <span className={`${styles.muted} ${styles.tiny}`}>Last 30 days</span>
          </div>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Google account</th>
                  <th>Name Google gave</th>
                  <th>Tried</th>
                  <th>What to do</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>
                      <strong>{attempt.email}</strong>
                    </td>
                    <td className={styles.muted}>{attempt.name}</td>
                    <td className={`${styles.muted} ${styles.tiny}`}>
                      {formatLongDate(attempt.lastTriedAt)}
                      {attempt.attempts > 1 ? `, ${attempt.attempts} times` : ''}
                    </td>
                    <td>
                      <span className={styles.actions}>
                        <Button variant="gold" size="sm" onClick={() => {}}>
                          Add household
                        </Button>
                        <Button variant="line" size="sm" onClick={() => {}}>
                          Ignore
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pad} style={{ paddingTop: 14 }}>
            <p className={`${styles.muted} ${styles.tiny}`}>
              Nobody can create an account for themselves. When someone signs in with a Google address you have not
              added, they are turned away politely and land here so you can decide.
            </p>
          </div>
        </section>
      ) : null}

      <section className={styles.panel} aria-labelledby="members-title">
        <div className={styles.panelHead}>
          <h2 id="members-title" className={styles.panelTitle}>
            Members
          </h2>
          <span className={`${styles.muted} ${styles.tiny}`}>
            {households?.length ?? 0} households
            {neverSignedIn > 0 ? ` · ${neverSignedIn} never signed in` : ''}
          </span>
        </div>
        {isPending ? (
          <p className={styles.empty} aria-busy="true">
            Loading…
          </p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Household</th>
                  <th>Main contact</th>
                  <th>Google account</th>
                  <th>Size</th>
                  <th>Membership</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {(households ?? []).map((household) => (
                  <tr key={household.id}>
                    <td>
                      <strong>{household.name}</strong>
                      {household.id === who?.householdId ? (
                        <span className={`${styles.muted} ${styles.tiny}`}> (you)</span>
                      ) : null}
                    </td>
                    <td className={styles.muted}>{household.contactName}</td>
                    <td className={`${styles.tiny} ${styles.muted}`}>
                      {household.googleEmail ?? <span className={styles.pillPast}>Never signed in</span>}
                    </td>
                    <td className={`${styles.num} ${styles.muted}`}>{describeSize(household)}</td>
                    <td>
                      <span className={household.membership.status === 'active' ? styles.pillLive : styles.pillPast}>
                        {household.membership.status === 'active' ? 'Paid' : 'Lapsed'}
                      </span>
                    </td>
                    <td>
                      <span className={household.role === 'admin' ? styles.pillWait : styles.pill}>
                        {household.role === 'admin' ? 'Admin' : 'Member'}
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
            A household can only sign in with the Google address recorded here. Only an admin can change a role, and
            the portal will not let you remove your own admin rights if you are the last one.
          </p>
        </div>
      </section>
    </div>
  )
}
