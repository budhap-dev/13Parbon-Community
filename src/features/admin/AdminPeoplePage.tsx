import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { HouseholdForm } from '@/components/HouseholdForm'
import { RemoveHousehold } from '@/components/RemoveHousehold'
import { formatLongDate } from '@/domain/dates'
import { committeeCsv, committeeCsvFilename } from '@/domain/committeeExport'
import { describeSize, type Household } from '@/domain/household'
import {
  useAddHousehold,
  useDeleteHousehold,
  useHouseholdExport,
  useHouseholds,
  useSignInAttempts,
  useUpdateHousehold,
  useViewer,
} from '@/lib/api'
import { useSignedIn } from '@/lib/auth/session'
import styles from '@/features/portal/Portal.module.css'

export function AdminPeoplePage() {
  useDocumentTitle('People')
  const who = useSignedIn()
  const viewer = useViewer()
  const { data: households, isPending } = useHouseholds()
  const { data: attempts } = useSignInAttempts()
  const add = useAddHousehold()
  const update = useUpdateHousehold()
  const remove = useDeleteHousehold()
  const [open, setOpenRaw] = useState<Household | 'new' | null>(null)
  const copy = useHouseholdExport(open && open !== 'new' ? open.id : undefined)
  // null is closed, 'new' is the invitation form, a household is that one being edited.
  const setOpen = (next: Household | 'new' | null) => {
    remove.reset()
    setOpenRaw(next)
  }

  const neverSignedIn = households?.filter((h) => !h.googleEmail).length ?? 0

  const saveList = () => {
    if (!households?.length) return
    const blob = new Blob([committeeCsv(households)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = committeeCsvFilename(new Date().toISOString())
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  const saving = add.isPending || update.isPending
  const failure = add.isError ? add.error.message : update.isError ? update.error.message : undefined

  if (open) {
    const adding = open === 'new'
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>{adding ? 'Add a household' : open.name}</h1>
            <p className={styles.sub}>
              {adding
                ? 'Membership is by invitation. Recording the Google address here is what lets them in — there is no other way and nobody can set their own.'
                : 'Everything the committee holds about this household. Changes are recorded against your name.'}
            </p>
          </div>
          <Button variant="line" size="sm" onClick={() => setOpen(null)}>
            Cancel
          </Button>
        </div>
        <section className={styles.panel}>
          <div className={styles.pad}>
            <HouseholdForm
              household={adding ? undefined : open}
              viewer={viewer}
              saving={saving}
              error={failure}
              onSave={(draft) =>
                adding
                  ? add.mutate(draft, { onSuccess: () => setOpen(null) })
                  : update.mutate({ id: open.id, draft }, { onSuccess: () => setOpen(null) })
              }
            />
          </div>
        </section>

        {!adding && open.id !== who?.householdId ? (
          <section className={styles.panel} aria-labelledby="remove-title">
            <div className={styles.panelHead}>
              <h2 id="remove-title" className={styles.panelTitle}>
                Removing them
              </h2>
            </div>
            <div className={styles.pad}>
              <RemoveHousehold
                household={open}
                removing={remove.isPending}
                error={remove.isError ? remove.error.message : undefined}
                copy={copy.data}
                gatheringCopy={copy.isFetching}
                onAskForCopy={() => void copy.refetch()}
                onRemove={() => remove.mutate(open.id, { onSuccess: () => setOpen(null) })}
              />
            </div>
          </section>
        ) : null}
      </div>
    )
  }

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
        <div className={styles.actions}>
          <Button variant="line" size="sm" onClick={saveList} disabled={!households?.length}>
            Save the list
          </Button>
          <Button variant="gold" size="sm" onClick={() => setOpen('new')}>
            Add a household
          </Button>
        </div>
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
                  <th><span className="sr-only">Edit</span></th>
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
                    <td>
                      <Button variant="line" size="sm" onClick={() => setOpen(household)}>
                        Edit<span className="sr-only"> {household.name}</span>
                      </Button>
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
          <p className={styles.note}>
            “Save the list” gives you a spreadsheet of households and headcounts — the numbers a caterer or a
            treasurer asks for. It carries no children’s names, no notes about anybody, and no sign-in addresses,
            because a file like that gets forwarded.
          </p>
        </div>
      </section>
    </div>
  )
}
