import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { ActionBar } from '@/components/ActionBar'
import { Button } from '@/components/Button'
import { ConfirmButton, UNTIL_SAVED } from '@/components/ConfirmButton'
import { Icon } from '@/components/Icon'
import { PhotoMono } from '@/components/PersonPhoto'
import { InfoNote } from '@/components/InfoNote'
import { LoadFailed } from '@/components/LoadFailed'
import { useSettings, useSettingsFailed, useSettingsLoaded } from '@/app/SettingsContext'
import { householdInitials, plainName, type Household } from '@/domain/household'
import { tidyCommittee, tidyRoles, type CommitteeMember, type SiteSettings } from '@/domain/settings'
import { useSaveSettings } from '@/lib/api'
import { toneStyle } from '@/features/portal/tones'
import portal from '@/features/portal/Portal.module.css'
import styles from './AdminCommittee.module.css'

/**
 * The committee, as the About page lists it: who holds which role this year.
 *
 * On People rather than among the settings for the pages, because who is on the committee is a
 * question about people, asked by somebody who has just come from the list of households. It
 * changes at the AGM, which should not need a developer.
 *
 * Not drawn until what is saved has been read: a copy taken of the code's defaults would light
 * up as unsaved, and its Save would write over the committee's own list.
 */
export function CommitteePanel({ households, onOpen }: { households?: Household[]; onOpen: (household: Household) => void }) {
  const settings = useSettings()
  const loaded = useSettingsLoaded()
  const read = useSettingsFailed()
  const save = useSaveSettings()

  if (!loaded) {
    return read.failed ? (
      <LoadFailed what="the committee" onRetry={read.retry} />
    ) : (
      <p className={portal.muted} role="status" aria-busy="true">
        Reading the committee…
      </p>
    )
  }
  return (
    <>
      <CommitteeEditor
        settings={settings}
        households={households}
        saving={save.isPending}
        saved={save.isSuccess}
        error={save.isError ? save.error.message : undefined}
        onSave={(committee, committeeRoles) => save.mutate({ ...settings, committee, committeeRoles })}
      />
      <PortalAccess households={households} onOpen={onOpen} />
    </>
  )
}

/** The choice in the role list that opens a box for one of the committee's own. */
const OWN_ROLE = '__own'

const TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.']
const TITLE = /^(mr|mrs|ms|miss|dr|prof)\.?\s+/i

/**
 * "Mr. Dalim Ghosh" as its title and the person. The households know people by name alone, and
 * the About page has always given a title, so the two are chosen apart and put back together.
 */
function splitTitle(name: string): { title: string; person: string } {
  const trimmed = name.trim()
  const found = trimmed.match(TITLE)
  if (!found) return { title: '', person: trimmed }
  const title = TITLES.find((t) => t.replace('.', '').toLowerCase() === found[1].toLowerCase()) ?? ''
  return { title, person: trimmed.slice(found[0].length) }
}

/** Two letters for a person's disc, leaving out the Mr. or Mrs.: "Mr. Dalim Ghosh" is DG. */
function personInitials(person: string): string {
  const words = person.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]
  return letters.toUpperCase()
}

/** A card as it is being edited: the name in its two halves, and a key that follows it when it moves. */
type Row = { key: number; role: string; ownRole: boolean; title: string; person: string; savedPhoto?: string }

let nextKey = 0
const toRow = (member: CommitteeMember): Row => ({
  key: nextKey++,
  role: member.role,
  ownRole: false,
  ...splitTitle(member.name),
  ...(member.photo ? { savedPhoto: member.photo } : {}),
})
const fullName = (row: Pick<Row, 'title' | 'person'>) => (row.person.trim() ? [row.title, row.person.trim()].filter(Boolean).join(' ') : '')
const toMember = (row: Row): CommitteeMember => ({ role: row.role, name: fullName(row) })

/**
 * Drag to put in order, or the arrow keys on the handle. The cards and the roles both use it.
 *
 * Only the handle starts a drag: a whole card that drags takes the mouse away from the lists and
 * boxes inside it. After a move by keyboard the handle is focused again in its new place, and a
 * line is left for a screen reader to say where it went.
 */
function useReorder<T extends { key: number }>(items: T[], setItems: (next: T[]) => void, prefix: string, describe: (item: T) => string) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [armed, setArmed] = useState<number | null>(null)
  const [said, setSaid] = useState('')
  const moved = useRef<number | null>(null)

  useEffect(() => {
    if (moved.current === null) return
    document.getElementById(`${prefix}-${moved.current}`)?.focus()
    moved.current = null
  }, [items, prefix])

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setItems(next)
    moved.current = item.key
    setSaid(`${describe(item)} is now ${to + 1} of ${items.length}.`)
  }

  const end = () => {
    setDragging(null)
    setOver(null)
    setArmed(null)
  }

  /** For the thing being moved. Its state is on `data-dragging` and `data-over`, for the styles. */
  const item = (i: number) => ({
    draggable: armed === i,
    'data-dragging': dragging === i || undefined,
    'data-over': (over === i && dragging !== null && dragging !== i) || undefined,
    onDragStart: (e: DragEvent) => {
      setDragging(i)
      e.dataTransfer.effectAllowed = 'move'
      // Firefox will not begin a drag unless something is on the transfer.
      e.dataTransfer.setData('text/plain', describe(items[i]))
    },
    onDragOver: (e: DragEvent) => {
      // Only a drag that began in this list; a card dropped among the roles is not a role.
      if (dragging === null) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setOver(i)
    },
    onDrop: (e: DragEvent) => {
      if (dragging === null) return
      e.preventDefault()
      move(dragging, i)
      end()
    },
    onDragEnd: end,
  })

  /** For its handle. Dragging is for a mouse and a thumb; the arrow keys are the same job for a keyboard. */
  const handle = (i: number) => ({
    type: 'button' as const,
    id: `${prefix}-${items[i].key}`,
    onPointerDown: () => setArmed(i),
    onPointerUp: () => setArmed(null),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        move(i, i - 1)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        move(i, i + 1)
      }
    },
  })

  return { said, item, handle }
}

/** A role on the list as it is being edited, with a key that follows it when it moves. */
type RoleRow = { key: number; name: string }
const toRoleRow = (name: string): RoleRow => ({ key: nextKey++, name })

function CommitteeEditor({
  settings,
  households,
  saving,
  saved,
  error,
  onSave,
}: {
  settings: SiteSettings
  households?: Household[]
  saving: boolean
  saved: boolean
  error?: string
  onSave: (committee: CommitteeMember[], roles: string[]) => void
}) {
  const [rows, setRows] = useState<Row[]>(() => settings.committee.map(toRow))
  const [roleRows, setRoleRows] = useState<RoleRow[]>(() => settings.committeeRoles.map(toRoleRow))
  // A role's name as it was when its box was entered, so the cards holding it can follow a rename.
  const renaming = useRef('')

  const cards = useReorder(rows, setRows, 'grip', (row) => row.role.trim() || fullName(row) || 'The card')
  const roleOrder = useReorder(roleRows, setRoleRows, 'role-grip', (role) => role.name.trim() || 'The role')

  // The grown-ups of every household, under the household's name. Children are not elected.
  const people = useMemo(
    () =>
      (households ?? [])
        .map((household) => ({ household, adults: household.people.filter((p) => p.ageGroup === 'adult') }))
        .filter((group) => group.adults.length > 0)
        .sort((a, b) => a.household.name.localeCompare(b.household.name)),
    [households],
  )
  // By name as both sides might write it: a household may put "Mr." in a name, as the About page does.
  const known = useMemo(() => new Set(people.flatMap((group) => group.adults.map((p) => plainName(p.name)))), [people])
  // Every grown-up's photograph by name; a name with none is there too, as having none.
  const photos = useMemo(() => new Map(people.flatMap((group) => group.adults.map((p) => [plainName(p.name), p.photo] as const))), [people])

  /*
   * Each card's photograph is its person's, from their household, copied in when the committee
   * is saved: the About page is public and the households are not. Until the households have
   * been read, and for somebody not in one, it is whatever was saved last time.
   */
  const photoFor = (row: Row): string | undefined => {
    const person = plainName(row.person)
    return households && photos.has(person) ? photos.get(person) : row.savedPhoto
  }
  const committee = tidyCommittee(rows.map((row) => ({ ...toMember(row), photo: photoFor(row) })))
  const roles = tidyRoles(roleRows.map((role) => role.name))
  const withoutPhotos = (list: CommitteeMember[]) => JSON.stringify(list.map(({ role, name }) => ({ role, name })))
  const unsaved =
    JSON.stringify(committee) !== JSON.stringify(settings.committee) ||
    JSON.stringify(roles) !== JSON.stringify(settings.committeeRoles)
  // Nothing typed, but somebody on the committee has a new photograph since it was last saved.
  const newPhotos = unsaved && withoutPhotos(committee) === withoutPhotos(settings.committee) && JSON.stringify(roles) === JSON.stringify(settings.committeeRoles)


  const set = (i: number, changes: Partial<Row>) => setRows((now) => now.map((row, j) => (i === j ? { ...row, ...changes } : row)))
  /** Once a rename is finished, the cards that held the old name take the new one. */
  const renamed = (to: string) => {
    const from = renaming.current.trim()
    const now = to.trim()
    if (from && now && from !== now) setRows((all) => all.map((row) => (!row.ownRole && row.role === from ? { ...row, role: now } : row)))
  }

  return (
    <form
      className={portal.page}
      onSubmit={(e) => {
        e.preventDefault()
        onSave(committee, roles)
      }}
    >
      <ActionBar
        status={
          error ? (
            <span className={portal.said} role="alert">
              {error}
            </span>
          ) : saved && !unsaved ? (
            <span className={portal.said} role="status">
              Saved. The About page changes for everybody straight away.
            </span>
          ) : newPhotos && !saving ? (
            <span className={portal.said} role="status">
              A new photograph on the committee. Save to put it on the About page.
            </span>
          ) : !unsaved && !saving ? (
            <span className={`${portal.muted} ${portal.tiny}`}>All saved</span>
          ) : null
        }
      >
        <Button variant="green" size="sm" onClick={() => setRows((now) => [...now, toRow({ role: '', name: '' })])}>
          Add somebody
        </Button>
        <Button variant={unsaved || saving ? 'gold' : 'line'} type="submit" size="sm" disabled={saving || !unsaved}>
          {saving ? 'Saving…' : 'Save the committee'}
        </Button>
      </ActionBar>

      <InfoNote summary="Where these show">
        <p>
          On the About page, in this order — which is not a ranking. Drag a card by its handle to change it. A card
          with no role or nobody chosen is left out rather than shown half-finished. The roles each card offers are
          kept under <strong>Roles to choose from</strong>, below the cards.
        </p>
      </InfoNote>

      <p className={styles.srOnly} role="status">
        {cards.said || roleOrder.said}
      </p>

      {rows.length === 0 ? (
        <div className={portal.emptyQuiet}>
          <p>Nobody on the committee yet.</p>
        </div>
      ) : (
        <ol className={styles.grid} aria-label="The committee">
          {rows.map((row, i) => {
            const name = fullName(row)
            const what = row.role.trim() || name || `card ${i + 1}`
            const outside = row.person.trim() !== '' && !known.has(plainName(row.person))
            // The household's own way of writing the chosen name, so the list shows it as chosen.
            const chosen = people.flatMap((group) => group.adults).find((p) => plainName(p.name) === plainName(row.person))
            return (
              <li key={row.key} className={`${styles.card} ${portal.rise}`} style={toneStyle(i)} {...cards.item(i)}>
                <div className={styles.cardHead}>
                  <PhotoMono photo={photoFor(row)} className={styles.mono}>
                    {row.person.trim() ? personInitials(row.person) : i + 1}
                  </PhotoMono>
                  <div className={styles.cardWords}>
                    <span className={styles.cardRole} title={row.role.trim() || undefined}>
                      {row.role.trim() || 'A new role'}
                    </span>
                    <span className={styles.cardName} title={name || undefined}>
                      {name || 'Nobody chosen yet'}
                    </span>
                  </div>
                </div>
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`role-${row.key}`}>
                      Role<span className={styles.srOnly}> {i + 1}</span>
                    </label>
                    <select
                      id={`role-${row.key}`}
                      className={styles.input}
                      value={row.ownRole ? OWN_ROLE : row.role}
                      onChange={(e) =>
                        e.target.value === OWN_ROLE ? set(i, { ownRole: true, role: '' }) : set(i, { ownRole: false, role: e.target.value })
                      }
                    >
                      <option value="">Choose a role…</option>
                      {/* A role taken off the list, or a one-off saved before: kept rather than lost. */}
                      {!row.ownRole && row.role && !roles.includes(row.role) ? (
                        <optgroup label="Not on the list">
                          <option value={row.role}>{row.role}</option>
                        </optgroup>
                      ) : null}
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                      <option value={OWN_ROLE}>Another role…</option>
                    </select>
                    {row.ownRole ? (
                      <>
                        <input
                          className={styles.input}
                          aria-label={`Role ${i + 1}, in your words`}
                          aria-describedby={`own-${row.key}`}
                          placeholder="What the role is called"
                          value={row.role}
                          autoFocus
                          onChange={(e) => set(i, { role: e.target.value })}
                        />
                        <p id={`own-${row.key}`} className={`${portal.muted} ${portal.tiny}`}>
                          Just for this card. To offer it every time, add it to the roles below.
                        </p>
                      </>
                    ) : null}
                  </div>
                  <div className={styles.nameRow}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor={`title-${row.key}`}>
                        Title<span className={styles.srOnly}> {i + 1}</span>
                      </label>
                      <select id={`title-${row.key}`} className={styles.input} value={row.title} onChange={(e) => set(i, { title: e.target.value })}>
                        <option value="">None</option>
                        {TITLES.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor={`name-${row.key}`}>
                        Name<span className={styles.srOnly}> {i + 1}</span>
                      </label>
                      <select
                        id={`name-${row.key}`}
                        className={styles.input}
                        value={chosen?.id ?? row.person.trim()}
                        onChange={(e) => {
                          const picked = people.flatMap((group) => group.adults).find((p) => p.id === e.target.value)
                          if (!picked) return set(i, { person: e.target.value })
                          // A household that wrote "Mr." into the name: the title goes in its own box,
                          // or the About page would read "Mr. Mr. …".
                          const split = splitTitle(picked.name)
                          set(i, { person: split.person, title: split.title || row.title })
                        }}
                      >
                        <option value="">Choose somebody…</option>
                        {/* Somebody saved before the households knew them, kept rather than lost. */}
                        {outside ? (
                          <optgroup label={households ? 'Not in a household' : 'Saved'}>
                            <option value={row.person.trim()}>{row.person.trim()}</option>
                          </optgroup>
                        ) : null}
                        {people.map(({ household, adults }) => (
                          <optgroup key={household.id} label={household.name}>
                            {adults.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className={styles.tools}>
                  <button className={styles.grip} aria-label={`Move ${what}. Drag it, or use the arrow keys.`} {...cards.handle(i)}>
                    <Icon name="grip" size={18} />
                    <span aria-hidden="true">Drag to move</span>
                  </button>
                  <ConfirmButton
                    aria-label={`Remove ${name || what}`}
                    title={`Remove ${row.role.trim() || name || 'this card'} from the committee?`}
                    body={UNTIL_SAVED}
                    onConfirm={() => setRows((now) => now.filter((_, j) => j !== i))}
                  >
                    Remove
                  </ConfirmButton>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <RolesPanel
        roleRows={roleRows}
        rows={rows}
        order={roleOrder}
        onAdd={() => setRoleRows((now) => [...now, toRoleRow('')])}
        onRename={(i, name) => setRoleRows((now) => now.map((role, j) => (i === j ? { ...role, name } : role)))}
        onFocus={(name) => (renaming.current = name)}
        onRenamed={renamed}
        onRemove={(i) => setRoleRows((now) => now.filter((_, j) => j !== i))}
      />
    </form>
  )
}

/**
 * The roles the cards offer, kept by the committee: added, renamed, put in order, taken off.
 *
 * Saved with the committee, by the same button, because the two are one change: a role added
 * here is usually added for a card above. Renaming a role renames it on the cards that hold it.
 * Taking one off the list leaves it on any card that has it, until somebody chooses another.
 */
function RolesPanel({
  roleRows,
  rows,
  order,
  onAdd,
  onRename,
  onFocus,
  onRenamed,
  onRemove,
}: {
  roleRows: RoleRow[]
  rows: Row[]
  order: ReturnType<typeof useReorder<RoleRow>>
  onAdd: () => void
  onRename: (i: number, name: string) => void
  onFocus: (name: string) => void
  onRenamed: (name: string) => void
  onRemove: (i: number) => void
}) {
  const named = roleRows.filter((role) => role.name.trim()).length
  return (
    <section className={portal.toneCard} style={toneStyle(4)} aria-labelledby="roles-title">
      <div className={portal.toneHead}>
        <h2 id="roles-title" className={portal.panelTitle}>
          Roles to choose from
        </h2>
        <span className={`${portal.muted} ${portal.tiny}`}>{named === 1 ? '1 role' : `${named} roles`}</span>
        <Button variant="green" size="sm" className={styles.headAction} onClick={onAdd}>
          Add a role
        </Button>
      </div>
      <div className={portal.pad}>
        {roleRows.length === 0 ? (
          <p className={`${portal.muted} ${portal.tiny}`}>No roles yet. Each card can still be given one of its own.</p>
        ) : (
          <ol className={styles.roles} aria-label="Roles to choose from">
            {roleRows.map((role, i) => {
              const name = role.name.trim()
              const held = name ? rows.filter((row) => row.role.trim() === name) : []
              const holders = held.length
              // Who holds it, by name, so the list says who is doing what rather than how many.
              const who = held.map((row) => fullName(row) || 'nobody chosen yet').join(', ')
              const what = name || `role ${i + 1}`
              return (
                <li key={role.key} className={styles.roleRow} {...order.item(i)}>
                  <button className={styles.gripOnly} aria-label={`Move ${what}. Drag it, or use the arrow keys.`} {...order.handle(i)}>
                    <Icon name="grip" size={18} />
                  </button>
                  <input
                    className={styles.input}
                    aria-label={`Role name ${i + 1}`}
                    placeholder="What the role is called"
                    value={role.name}
                    autoFocus={!role.name && i === roleRows.length - 1}
                    onFocus={(e) => onFocus(e.target.value)}
                    onChange={(e) => onRename(i, e.target.value)}
                    onBlur={(e) => onRenamed(e.target.value)}
                  />
                  {holders === 0 ? (
                    <span className={`${styles.holders} ${styles.unused}`}>Not in use</span>
                  ) : (
                    <span className={`${styles.holders} ${styles.held}`} title={who}>
                      <Icon name="users" size={13} />
                      <span className={styles.heldNames}>{who}</span>
                    </span>
                  )}
                  <ConfirmButton
                    size="sm"
                    aria-label={`Remove the role ${what}`}
                    title={`Take “${what}” off the list of roles?`}
                    body={
                      holders > 0
                        ? `${holders === 1 ? 'One card has' : `${holders} cards have`} this role, and ${holders === 1 ? 'keeps' : 'keep'} it until somebody chooses another. ${UNTIL_SAVED}`
                        : UNTIL_SAVED
                    }
                    onConfirm={() => onRemove(i)}
                  >
                    Remove
                  </ConfirmButton>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

/**
 * Who can open the committee's screens. Not the same list as the one above: the About page names
 * the officers, and this is the households whose role is Committee. Changed on the household.
 */
function PortalAccess({ households, onOpen }: { households?: Household[]; onOpen: (household: Household) => void }) {
  const admins = (households ?? []).filter((household) => household.role === 'admin')
  if (!households) return null
  return (
    <section className={portal.toneCard} style={toneStyle(2, '#7c3aed')} aria-labelledby="access-title">
      <div className={portal.toneHead}>
        <h2 id="access-title" className={portal.panelTitle}>
          Who can use these screens
        </h2>
        <span className={`${portal.muted} ${portal.tiny}`}>
          {admins.length === 1 ? '1 household' : `${admins.length} households`}
        </span>
      </div>
      <div className={portal.pad}>
        {admins.length === 0 ? (
          <p className={`${portal.muted} ${portal.tiny}`}>No household has the committee’s role.</p>
        ) : (
          <ul className={styles.access}>
            {admins.map((household, i) => (
              <li key={household.id} style={toneStyle(i)}>
                <span className={styles.accessMono} aria-hidden="true">
                  {householdInitials(household.name)}
                </span>
                <span className={styles.accessName}>{household.name}</span>
                <Button variant="blue" size="sm" aria-label={`Edit ${household.name}`} onClick={() => onOpen(household)}>
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className={`${portal.muted} ${portal.tiny}`} style={{ marginTop: 12 }}>
          A household’s role is set under <strong>Committee only</strong> when you edit it. The portal will not let
          the last admin take away their own.
        </p>
      </div>
    </section>
  )
}
