import { useState } from 'react'
import { ActionBar } from '@/components/ActionBar'
import { Button } from '@/components/Button'
import { ConfirmButton, UNTIL_SAVED } from '@/components/ConfirmButton'
import { InfoNote } from '@/components/InfoNote'
import { LoadFailed } from '@/components/LoadFailed'
import { useSettings, useSettingsFailed, useSettingsLoaded } from '@/app/SettingsContext'
import { householdInitials, type Household } from '@/domain/household'
import { tidyCommittee, type CommitteeMember, type SiteSettings } from '@/domain/settings'
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
        saving={save.isPending}
        saved={save.isSuccess}
        error={save.isError ? save.error.message : undefined}
        onSave={(committee) => save.mutate({ ...settings, committee })}
      />
      <PortalAccess households={households} onOpen={onOpen} />
    </>
  )
}

/** Two letters for a person's disc, leaving out the Mr. or Mrs.: "Mr. Dalim Ghosh" is DG. */
function personInitials(name: string): string {
  const words = name.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]
  return letters.toUpperCase()
}

function CommitteeEditor({
  settings,
  saving,
  saved,
  error,
  onSave,
}: {
  settings: SiteSettings
  saving: boolean
  saved: boolean
  error?: string
  onSave: (committee: CommitteeMember[]) => void
}) {
  const [rows, setRows] = useState<CommitteeMember[]>(() => settings.committee.map((row) => ({ ...row })))
  const unsaved = JSON.stringify(tidyCommittee(rows)) !== JSON.stringify(settings.committee)
  const set = (i: number, changes: Partial<CommitteeMember>) =>
    setRows((now) => now.map((row, j) => (i === j ? { ...row, ...changes } : row)))
  const move = (i: number, by: -1 | 1) =>
    setRows((now) => {
      const next = [...now]
      ;[next[i], next[i + by]] = [next[i + by], next[i]]
      return next
    })

  return (
    <form
      className={portal.page}
      onSubmit={(e) => {
        e.preventDefault()
        onSave(tidyCommittee(rows))
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
          ) : !unsaved && !saving ? (
            <span className={`${portal.muted} ${portal.tiny}`}>All saved</span>
          ) : null
        }
      >
        <Button variant="green" size="sm" onClick={() => setRows((now) => [...now, { role: '', name: '' }])}>
          Add somebody
        </Button>
        <Button variant={unsaved || saving ? 'gold' : 'line'} type="submit" size="sm" disabled={saving || !unsaved}>
          {saving ? 'Saving…' : 'Save the committee'}
        </Button>
      </ActionBar>

      <InfoNote summary="Where these show">
        <p>
          On the About page, in this order — which is not a ranking. A card with no role or no name is left
          out rather than shown half-finished.
        </p>
      </InfoNote>

      {rows.length === 0 ? (
        <div className={portal.emptyQuiet}>
          <p>Nobody on the committee yet.</p>
        </div>
      ) : (
        <ol className={styles.grid} aria-label="The committee">
          {rows.map((row, i) => {
            const what = row.role.trim() || row.name.trim() || `row ${i + 1}`
            return (
              <li key={i} className={`${styles.card} ${portal.rise}`} style={toneStyle(i)}>
                <div className={styles.cardHead}>
                  <span className={styles.mono} aria-hidden="true">
                    {row.name.trim() ? personInitials(row.name) : i + 1}
                  </span>
                  <div className={styles.cardWords}>
                    <span className={styles.cardRole}>{row.role.trim() || 'A new role'}</span>
                    <span className={styles.cardName}>{row.name.trim() || 'Nobody named yet'}</span>
                  </div>
                </div>
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`role-${i}`}>
                      Role {i + 1}
                    </label>
                    <input id={`role-${i}`} className={styles.input} value={row.role} onChange={(e) => set(i, { role: e.target.value })} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`name-${i}`}>
                      Name {i + 1}
                    </label>
                    <input id={`name-${i}`} className={styles.input} value={row.name} onChange={(e) => set(i, { name: e.target.value })} />
                  </div>
                </div>
                <div className={styles.tools}>
                  <Button variant="teal" size="sm" aria-label={`Move ${what} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    Up
                  </Button>
                  <Button variant="violet" size="sm" aria-label={`Move ${what} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    Down
                  </Button>
                  <ConfirmButton
                    aria-label={`Remove ${row.name || `row ${i + 1}`}`}
                    title={`Remove ${row.role.trim() || row.name.trim() || 'this row'} from the committee?`}
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
    </form>
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
