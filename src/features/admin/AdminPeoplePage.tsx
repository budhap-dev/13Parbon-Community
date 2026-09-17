import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { unresolved } from '@/domain/document'
import { Button } from '@/components/Button'
import { HouseholdForm } from '@/components/HouseholdForm'
import { RemoveHousehold } from '@/components/RemoveHousehold'
import { formatLongDate } from '@/domain/dates'
import { committeeCsv, committeeCsvFilename } from '@/domain/committeeExport'
import { describeSize, type Household } from '@/domain/household'
import type { HouseholdDraft } from '@/domain/household'
import {
  useAddHousehold,
  useDeleteHousehold,
  useHouseholdExport,
  useHouseholds,
  useResolveSignInAttempt,
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
  const { data: allAttempts } = useSignInAttempts()
  // Resolved ones are kept, so a second knock does not read as a first — but the screen is
  // about what still wants a decision.
  const attempts = unresolved(allAttempts)
  const add = useAddHousehold()
  const update = useUpdateHousehold()
  const remove = useDeleteHousehold()
  const resolve = useResolveSignInAttempt()
  const [open, setOpenRaw] = useState<Household | 'new' | null>(null)
  // The household form replaces the list in place, from a button at the foot of a long table.
  useScrollToTopOn(open)
  // What we already know about somebody who has been knocking, carried into the empty form.
  const [prefill, setPrefill] = useState<Partial<HouseholdDraft> | undefined>()
  const copy = useHouseholdExport(open && open !== 'new' ? open.id : undefined)
  // null is closed, 'new' is the invitation form, a household is that one being edited.
  const setOpen = (next: Household | 'new' | null, from?: Partial<HouseholdDraft>) => {
    remove.reset()
    setPrefill(from)
    setOpenRaw(next)
  }

  /**
   * Turning a knock into an invitation. Google told us the address and the name it is under,
   * and re-typing what we were already told is how addresses get mistyped — which, here, is
   * somebody locked out for a reason nobody can guess.
   */
  const inviteFromAttempt = (attempt: { email: string; name: string }) =>
    setOpen('new', {
      googleEmail: attempt.email,
      email: attempt.email,
      contactName: attempt.name,
      people: [{ name: attempt.name, ageGroup: 'adult' }],
    })

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
              prefill={adding ? prefill : undefined}
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
                        <Button
                          variant="gold"
                          size="sm"
                          aria-label={`Add household for ${attempt.email}`}
                          onClick={() => inviteFromAttempt(attempt)}
                        >
                          Add household
                        </Button>
                        <Button
                          variant="line"
                          size="sm"
                          disabled={resolve.isPending}
                          aria-label={`Ignore ${attempt.email}`}
                          onClick={() => resolve.mutate(attempt.id)}
                        >
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
                      <Button
                        variant="line"
                        size="sm"
                        aria-label={`Edit ${household.name}`}
                        onClick={() => setOpen(household)}
                      >
                        Edit
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
