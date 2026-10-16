import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ActionBar } from '@/components/ActionBar'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { unresolved, type SignInAttempt } from '@/domain/document'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { HouseholdForm } from '@/components/HouseholdForm'
import { InfoNote } from '@/components/InfoNote'
import { LoadFailed } from '@/components/LoadFailed'
import { Modal } from '@/components/Modal'
import { RemoveHousehold } from '@/components/RemoveHousehold'
import { RowMenu } from '@/components/RowMenu'
import { formatDateWithYear, formatLongDate } from '@/domain/dates'
import { committeeCsv, committeeCsvFilename } from '@/domain/committeeExport'
import { describeSize, householdInitials, householdMatches, householdPhoto, type Household } from '@/domain/household'
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
import { CommitteePanel } from './AdminCommittee'
import { LinkToMember } from './LinkToMember'
import { PhotoMono } from '@/components/PersonPhoto'

type FilterKey = 'all' | 'paid' | 'lapsed' | 'never' | 'admins'
/** The chips over the list, each with how many it would leave. */
const FILTERS: Record<FilterKey, { label: string; keep: (h: Household) => boolean }> = {
  all: { label: 'Everyone', keep: () => true },
  paid: { label: 'Paid', keep: (h) => h.membership.status === 'active' },
  lapsed: { label: 'Lapsed', keep: (h) => h.membership.status !== 'active' },
  never: { label: 'Never signed in', keep: (h) => !h.googleEmail },
  admins: { label: 'Admins', keep: (h) => h.role === 'admin' },
}

export function AdminPeoplePage() {
  useDocumentTitle('People')
  const who = useSignedIn()
  const viewer = useViewer()
  const { data: households, isPending, isError, refetch } = useHouseholds()
  const { data: allAttempts, isError: attemptsFailed, refetch: refetchAttempts } = useSignInAttempts()
  // Resolved ones are kept, so a second knock does not read as a first — but the screen is
  // about what still wants a decision.
  const attempts = unresolved(allAttempts, households)
  const add = useAddHousehold()
  const update = useUpdateHousehold()
  const remove = useDeleteHousehold()
  const resolve = useResolveSignInAttempt()
  const [open, setOpenRaw] = useState<Household | null>(null)
  /** Adding is a form over the list rather than in place of it: see `Modal`. */
  const [adding, setAdding] = useState(false)
  /** What the last save did, said on the list it lands back on. */
  const [saved, setSaved] = useState<string | null>(null)
  // The household form replaces the list in place, from a button at the foot of a long table.
  useScrollToTopOn(open)
  // "Remove…" from a row's menu opens the same form, but at the part that does the removing.
  const [toRemove, setToRemove] = useState(false)
  const removePanel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open || !toRemove) return
    removePanel.current?.scrollIntoView({ block: 'center' })
    removePanel.current?.focus({ preventScroll: true })
  }, [open, toRemove])
  // What we already know about somebody who has been knocking, carried into the empty form.
  const [prefill, setPrefill] = useState<Partial<HouseholdDraft> | undefined>()
  /** Somebody knocking whom the committee knows: an adult already on the list, being picked. */
  const [linking, setLinking] = useState<SignInAttempt | null>(null)
  const copy = useHouseholdExport(open ? open.id : undefined)
  // null is closed, a household is that one being edited.
  const setOpen = (next: Household | null) => {
    remove.reset()
    setSaved(null)
    setToRemove(false)
    setOpenRaw(next)
  }
  const startAdding = (from?: Partial<HouseholdDraft>) => {
    add.reset()
    setSaved(null)
    setPrefill(from)
    setAdding(true)
  }

  /*
   * Two tabs: the households, and the committee as the About page names it. In the address, so
   * the portal's search can land on the committee and a reload stays where it was.
   */
  const [params, setParams] = useSearchParams()
  const tab: 'households' | 'committee' = params.get('tab') === 'committee' ? 'committee' : 'households'
  const showTab = (next: typeof tab) =>
    setParams(
      (now) => {
        const after = new URLSearchParams(now)
        if (next === 'households') after.delete('tab')
        else after.set('tab', next)
        return after
      },
      { replace: true, preventScrollReset: true },
    )
  useOpenFromAddress(households, (household) => setOpen(household))

  /**
   * Turning a knock into an invitation. Google told us the address and the name it is under,
   * and re-typing what we were already told is how addresses get mistyped — which, here, is
   * somebody locked out for a reason nobody can guess.
   */
  const inviteFromAttempt = (attempt: { email: string; name: string }) =>
    startAdding({
      googleEmail: attempt.email,
      email: attempt.email,
      contactName: attempt.name,
      people: [{ name: attempt.name, ageGroup: 'adult' }],
    })

  const neverSignedIn = households?.filter((h) => !h.googleEmail).length ?? 0
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const counted = (households ?? []).filter((household) => householdMatches(household, query))
  const shown = counted.filter(FILTERS[filter].keep)

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
  const addModal = (
    <Modal open={adding} eyebrow="People" title="Add a household" busy={add.isPending} onClose={() => setAdding(false)}>
      <p className={`${styles.muted} ${styles.tiny}`} style={{ marginBottom: 16 }}>
        Membership is by invitation. Recording the Google address here is what lets them in — there is no other
        way and nobody can set their own.
      </p>
      <HouseholdForm
        prefill={prefill}
        viewer={viewer}
        saving={add.isPending}
        error={add.isError ? add.error.message : undefined}
        onSave={(draft) =>
          add.mutate(draft, {
            onSuccess: () => {
              setAdding(false)
              setSaved(`${draft.name.trim() || 'The household'} is added.`)
            },
          })
        }
      />
    </Modal>
  )

  const linkModal = (
    <Modal open={linking !== null} eyebrow="People" title="Link to a member" onClose={() => setLinking(null)}>
      {linking ? (
        <LinkToMember
          attempt={linking}
          households={households ?? []}
          onCancel={() => setLinking(null)}
          onLinked={(message) => {
            setLinking(null)
            setSaved(message)
          }}
        />
      ) : null}
    </Modal>
  )

  if (open) {
    const paid = open.membership.status === 'active'
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <p className={styles.eyebrow}>Editing a household</p>
            <p className={styles.sub}>Everything the committee holds about this household. Changes are recorded against your name.</p>
          </div>
          <Button variant="line" size="sm" onClick={() => setOpen(null)}>
            Cancel
          </Button>
        </div>

        {/* Who they are and where their membership stands, as business cards over the form. */}
        <div className={styles.bizRow}>
          <section className={`${styles.bizCard} ${styles.rise}`} aria-labelledby="editing-title">
            <div className={styles.bizTop}>
              <div>
                <p className={styles.bizEyebrow}>Household</p>
                <h1 id="editing-title" className={styles.bizName}>
                  {open.name}
                </h1>
              </div>
              <PhotoMono photo={householdPhoto(open)} className={styles.bizMono}>
                {householdInitials(open.name)}
              </PhotoMono>
            </div>
            <dl className={styles.bizFactsWide}>
              <div>
                <dt>Main contact</dt>
                <dd>{open.contactName || 'Not given'}</dd>
              </div>
              <div>
                <dt>Who is in it</dt>
                <dd>{describeSize(open)}</dd>
              </div>
              <div>
                <dt>Signs in with</dt>
                <dd>{open.googleEmail ?? 'Never signed in'}</dd>
              </div>
            </dl>
          </section>
          <section
            className={`${styles.bizCard} ${paid ? styles.bizGood : styles.bizWarn} ${styles.rise}`}
            style={{ '--i': 1 } as React.CSSProperties}
            aria-labelledby="editing-membership"
          >
            <div className={styles.bizTop}>
              <div>
                <p className={styles.bizEyebrow}>Membership</p>
                <h2 id="editing-membership" className={styles.bizName}>
                  {paid ? 'Paid' : 'Lapsed'}
                </h2>
              </div>
              <span className={styles.bizChip}>{open.role === 'admin' ? 'Committee' : 'Member'}</span>
            </div>
            <dl className={styles.bizFacts}>
              <div>
                <dt>Paid up to</dt>
                <dd>{open.membership.paidTo ? formatDateWithYear(open.membership.paidTo) : 'Not recorded'}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{formatDateWithYear(open.memberSince)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <HouseholdForm
          household={open}
          viewer={viewer}
          saving={update.isPending}
          error={update.isError ? update.error.message : undefined}
          onSave={(draft) =>
            update.mutate(
              { id: open.id, draft },
              {
                onSuccess: () => {
                  setOpen(null)
                  setSaved(`${draft.name.trim() || open.name} is saved.`)
                },
              },
            )
          }
        />

        {open.id !== who?.householdId ? (
          <section className={`${styles.toneCard} ${styles.rise}`} style={{ '--tone': 'var(--error)' } as React.CSSProperties} aria-labelledby="remove-title" ref={removePanel} tabIndex={-1}>
            <div className={styles.toneHead}>
              {/* The ground's colour on the red, since the red is pale in a dark theme. */}
              <span className={styles.toneIcon} style={{ color: 'var(--color-bg-raised)' }} aria-hidden="true">
                <Icon name="trash" size={17} />
              </span>
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
      {addModal}
      {linkModal}
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>People</h1>
          <p className={styles.sub}>
            Membership is by invitation: add the households, and decide who acts for the committee.
          </p>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="People">
        {(
          [
            ['households', 'Households'],
            ['committee', 'Committee'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            className={tab === key ? styles.tabOn : styles.tab}
            onClick={() => showTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'committee' ? (
        <div role="tabpanel" id="panel-committee" aria-labelledby="tab-committee" className={styles.page}>
          <CommitteePanel households={households} onOpen={(household) => setOpen(household)} />
        </div>
      ) : (
        <div role="tabpanel" id="panel-households" aria-labelledby="tab-households" className={styles.page}>
          <ActionBar
            status={
              saved ? (
                <span className={styles.said} role="status">
                  {saved}
                </span>
              ) : null
            }
          >
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
            <Button variant="gold" size="sm" onClick={() => startAdding()}>
              Add a household
            </Button>
          </ActionBar>

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
                <table className={`${styles.table} ${styles.cardsOnPhone}`}>
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
                        <td data-label="Google account">
                          <strong>{attempt.email}</strong>
                        </td>
                        <td data-label="Name Google gave" className={styles.muted}>{attempt.name}</td>
                        <td data-label="Tried" className={`${styles.muted} ${styles.tiny}`}>
                          {formatLongDate(attempt.lastTriedAt)}
                          {attempt.attempts > 1 ? `, ${attempt.attempts} times` : ''}
                        </td>
                        <td data-label="What to do" className={styles.wideOnPhone}>
                          <span className={styles.actions}>
                            <Button
                              variant="gold"
                              size="sm"
                              aria-label={`Link ${attempt.email} to a member`}
                              onClick={() => {
                                setSaved(null)
                                setLinking(attempt)
                              }}
                            >
                              Link to a member
                            </Button>
                            <Button
                              variant="line"
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
                <InfoNote summary="Why they are here">
                  <p>
                    Nobody can create an account for themselves. When someone signs in with a Google address you have
                    not added, they are turned away politely and land here so you can decide.
                  </p>
                  <p>
                    <strong>Link to a member</strong> is for someone already on the list, such as a second adult in a
                    household who uses their own Google account: pick them, and that address signs them in to their
                    household. <strong>Add household</strong> is for somebody new.
                  </p>
                </InfoNote>
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
            {households?.length ? (
              <div className={styles.filterChips} role="group" aria-label="Show">
                {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={filter === key ? styles.chipOn : styles.chip}
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                  >
                    {FILTERS[key].label} <span className={styles.chipCount}>{counted.filter(FILTERS[key].keep).length}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {isPending ? (
              <div className={styles.list} aria-busy="true">
                <span className="sr-only">Loading the households…</span>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={styles.listItem}>
                    <span className={styles.skeletonAvatar} />
                    <span className={styles.skeleton} />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className={styles.pad}>
                <LoadFailed what="the households" onRetry={() => void refetch()} />
              </div>
            ) : !households?.length ? (
              <div className={styles.emptyQuiet}>
                <p>No households yet.</p>
                <Button variant="gold" size="sm" onClick={() => startAdding()}>
                  Add a household
                </Button>
              </div>
            ) : shown.length === 0 ? (
              <div className={styles.emptyQuiet}>
                <p>{query.trim() ? `Nobody matches “${query.trim()}”.` : 'Nobody here.'}</p>
                <Button
                  variant="line"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                >
                  {query.trim() ? 'Clear the search' : 'Show everyone'}
                </Button>
              </div>
            ) : (
              // Its own scroll, with the column labels pinned: forty households is a page of its own,
              // and the explanation under the table should not need a hunt to find.
              <div className={styles.boxed} tabIndex={0} role="region" aria-label="Members list">
                <table className={`${styles.table} ${styles.oneLine} ${styles.businessCards} ${styles.rows}`}>
                  <thead>
                    <tr>
                      <th>Household</th>
                      <th>Google account</th>
                      <th>Size</th>
                      <th>Membership</th>
                      <th>Role</th>
                      <th>
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((household) => (
                      <tr key={household.id}>
                        <td data-label="Household">
                          <span className={styles.who}>
                            <PhotoMono photo={householdPhoto(household)} className={styles.initials}>
                              {householdInitials(household.name)}
                            </PhotoMono>
                            <span className={styles.whoText}>
                              <strong>
                                {household.name}
                                {household.id === who?.householdId ? (
                                  <span className={`${styles.muted} ${styles.tiny}`}> (you)</span>
                                ) : null}
                              </strong>
                              <span className={`${styles.muted} ${styles.tiny}`}>
                                {[household.contactName, household.email ?? household.phone].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td data-label="Google account" className={`${styles.tiny} ${styles.muted} ${styles.wideOnPhone}`}>
                          {household.googleEmail ?? <span className={styles.pillPast}>Never signed in</span>}
                        </td>
                        <td data-label="Size" className={`${styles.num} ${styles.muted} ${styles.nowrap}`}>
                          {describeSize(household)}
                        </td>
                        <td data-label="Membership">
                          <span className={household.membership.status === 'active' ? styles.pillLive : styles.pillPast}>
                            {household.membership.status === 'active' ? 'Paid' : 'Lapsed'}
                          </span>
                        </td>
                        <td data-label="Role">
                          <span className={styles.pillTag}>{household.role === 'admin' ? 'Admin' : 'Member'}</span>
                        </td>
                        <td className={styles.rowActions}>
                          <span className={styles.actions}>
                            <Button
                              variant="line"
                              size="sm"
                              aria-label={`Edit ${household.name}`}
                              onClick={() => setOpen(household)}
                            >
                              Edit
                            </Button>
                            <RowMenu
                              about={household.name}
                              items={[
                                ...(household.email ? [{ label: `Email ${household.contactName}`, href: `mailto:${household.email}` }] : []),
                                ...(household.phone ? [{ label: `Call ${household.contactName}`, href: `tel:${household.phone}` }] : []),
                                ...(household.id !== who?.householdId
                                  ? [
                                      {
                                        label: 'Remove…',
                                        danger: true,
                                        onSelect: () => {
                                          setOpen(household)
                                          setToRemove(true)
                                        },
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </span>
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
      )}
    </div>
  )
}
