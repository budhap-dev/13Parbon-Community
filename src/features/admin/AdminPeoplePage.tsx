import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { unresolved } from '@/domain/document'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { HouseholdForm } from '@/components/HouseholdForm'
import { InfoNote } from '@/components/InfoNote'
import { LoadFailed } from '@/components/LoadFailed'
import { RemoveHousehold } from '@/components/RemoveHousehold'
import { formatLongDate } from '@/domain/dates'
import { committeeCsv, committeeCsvFilename } from '@/domain/committeeExport'
import { describeSize, householdMatches, type Household } from '@/domain/household'
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
  const { data: households, isPending, isError, refetch } = useHouseholds()
  const { data: allAttempts, isError: attemptsFailed, refetch: refetchAttempts } = useSignInAttempts()
  // Resolved ones are kept, so a second knock does not read as a first — but the screen is
  // about what still wants a decision.
  const attempts = unresolved(allAttempts)
  const add = useAddHousehold()
  const update = useUpdateHousehold()
  const remove = useDeleteHousehold()
  const resolve = useResolveSignInAttempt()
  const [open, setOpenRaw] = useState<Household | 'new' | null>(null)
  /** What the last save did, said on the list it lands back on. */
  const [saved, setSaved] = useState<string | null>(null)
  // The household form replaces the list in place, from a button at the foot of a long table.
  useScrollToTopOn(open)
  // What we already know about somebody who has been knocking, carried into the empty form.
  const [prefill, setPrefill] = useState<Partial<HouseholdDraft> | undefined>()
  const copy = useHouseholdExport(open && open !== 'new' ? open.id : undefined)
  // null is closed, 'new' is the invitation form, a household is that one being edited.
  const setOpen = (next: Household | 'new' | null, from?: Partial<HouseholdDraft>) => {
    remove.reset()
    setSaved(null)
    setPrefill(from)
    setOpenRaw(next)
  }
  useOpenFromAddress(households, (household) => setOpen(household))

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
  const [query, setQuery] = useState('')
  const shown = (households ?? []).filter((household) => householdMatches(household, query))

  /*
   * Asked first, and said what it is. The button used to download on the spot, so a press meant
   * to see what it did left a file of every household in Downloads — one that gets forwarded.
   */
  const [askingToSave, setAskingToSave] = useState(false)
  const filename = committeeCsvFilename(new Date().toISOString())
  const saveList = () => {
    setAskingToSave(false)
    if (!households?.length) return
    const blob = new Blob([committeeCsv(households)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
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
              onSave={(draft) => {
                const done = (text: string) => () => {
                  setOpen(null)
                  setSaved(text)
                }
                const name = draft.name.trim()
                if (adding) add.mutate(draft, { onSuccess: done(`${name || 'The household'} is added.`) })
                else update.mutate({ id: open.id, draft }, { onSuccess: done(`${name || open.name} is saved.`) })
              }}
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
                // Not while it is asking again: "could not" beside "Gathering…" says two things at once.
                copyError={
                  copy.isError && !copy.isFetching
                    ? `We could not gather the copy just now. ${copy.error.message}`
                    : undefined
                }
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
          <Button variant="line" size="sm" onClick={() => setAskingToSave(true)} disabled={!households?.length}>
            Save the list
          </Button>
          <ConfirmDialog
            open={askingToSave}
            title="Download the list for Excel?"
            confirmLabel="Download"
            cancelLabel="Not now"
            tone="plain"
            onCancel={() => setAskingToSave(false)}
            onConfirm={saveList}
          >
            <p>
              A spreadsheet file, <strong>{filename}</strong>, that opens in Excel — or Numbers or Google
              Sheets. One row for each of the {households?.length ?? 0} households: the main contact, their
              email and phone, how many adults and children, and their membership.
            </p>
            <p style={{ marginTop: 10 }}>
              It has no children’s names, no notes about anybody and no sign-in addresses. It does have
              everybody’s contact details, so keep it to the committee.
            </p>
          </ConfirmDialog>
          <Button variant="gold" size="sm" onClick={() => setOpen('new')}>
            Add a household
          </Button>
        </div>
      </div>

      {saved ? (
        <p className={styles.said} role="status">
          {saved}
        </p>
      ) : null}

      {/* Hidden when there is nobody to decide about, but not when the list could not be read:
          that would look exactly like nobody knocking. */}
      {attemptsFailed ? (
        <section className={styles.panel} aria-labelledby="attempts-title">
          <div className={styles.panelHead}>
            <h2 id="attempts-title" className={styles.panelTitle}>
              Tried to sign in, not on the list
            </h2>
          </div>
          <div className={styles.pad}>
            <LoadFailed what="who has tried to sign in" onRetry={() => void refetchAttempts()} />
          </div>
        </section>
      ) : attempts && attempts.length > 0 ? (
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
            {resolve.isError ? (
              <p className={`${styles.muted} ${styles.tiny}`} role="alert" style={{ marginBottom: 8 }}>
                That did not save, so they are still on the list. {resolve.error.message}
              </p>
            ) : null}
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
          {/* A count only once there is one: "0 households" over a list that failed is a fright. */}
          {households ? (
            <span className={`${styles.muted} ${styles.tiny}`}>
              {households.length} households
              {neverSignedIn > 0 ? ` · ${neverSignedIn} never signed in` : ''}
            </span>
          ) : null}
        </div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Icon name="search" size={17} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              aria-label="Search members"
              placeholder="Search by household, name, email or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {query.trim() ? (
            <span className={`${styles.muted} ${styles.tiny}`} role="status">
              {shown.length === 1 ? '1 household matches' : `${shown.length} households match`}
            </span>
          ) : null}
        </div>
        {isPending ? (
          <p className={styles.empty} aria-busy="true">
            Loading…
          </p>
        ) : isError ? (
          <div className={styles.pad}>
            <LoadFailed what="the households" onRetry={() => void refetch()} />
          </div>
        ) : !households?.length ? (
          <p className={styles.empty}>No households yet. Add the first with Add a household.</p>
        ) : query.trim() && shown.length === 0 ? (
          <p className={styles.pad}>
            <span className={styles.muted}>Nobody matches “{query.trim()}”.</span>{' '}
            <button type="button" className={styles.inlineButton} onClick={() => setQuery('')}>
              Clear the search
            </button>
          </p>
        ) : (
          // Its own scroll, with the column labels pinned: forty households is a page of its own,
          // and the explanation under the table should not need a hunt to find.
          <div className={styles.boxed} tabIndex={0} role="region" aria-label="Members list">
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
                {shown.map((household) => (
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
        <div className={styles.pad} style={{ paddingTop: 8, paddingBottom: 10 }}>
          <InfoNote summary="Who can sign in, and who can change roles">
            <p>
              A household can only sign in with the Google address recorded here. Only an admin can change a role,
              and the portal will not let you remove your own admin rights if you are the last one.
            </p>
          </InfoNote>
          <InfoNote summary="What “Save the list” puts in the file">
            <p>
              A spreadsheet for Excel: each household’s main contact, email and phone, its headcounts and its
              membership — what a caterer or a treasurer asks for. It carries no children’s names, no notes about
              anybody, and no sign-in addresses, because a file like that gets forwarded.
            </p>
          </InfoNote>
        </div>
      </section>
    </div>
  )
}
