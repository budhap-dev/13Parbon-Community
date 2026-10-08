import { useState } from 'react'
import { Link } from 'react-router'
import { useSettings, useSettingsFailed, useSettingsLoaded } from '@/app/SettingsContext'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { LoadFailed } from '@/components/LoadFailed'
import type { SiteSettings } from '@/domain/settings'
import { sponsorSummary, tidySponsors, type Sponsor } from '@/domain/sponsors'
import { useSaveSettings } from '@/lib/api'
import styles from '@/features/portal/Portal.module.css'
import forms from './ContentForms.module.css'
import { SponsorsEditor } from './SettingsEditors'


/**
 * The sponsors: who they are, and whether the public site thanks them at all.
 *
 * A screen of its own rather than a section of Content. It is a list somebody comes back to
 * through the year — a new sponsor at each festival — and "where do I add a sponsor?" should be
 * answered by the sidebar, not by opening the fourteenth collapsed section on another screen.
 *
 * The list lives in the site's settings, like the committee and the festivals, so it waits for
 * what is saved before it opens: a form opened on the code's empty list would offer to save
 * that over the committee's.
 */
export function AdminSponsorsPage() {
  useDocumentTitle('Sponsors')
  const settings = useSettings()
  const loaded = useSettingsLoaded()
  const read = useSettingsFailed()

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Sponsors</h1>
          <p className={styles.sub}>
            The businesses, families and friends who help pay for the year, and how the public site
            thanks them.
          </p>
        </div>
      </div>
      {loaded ? (
        <SponsorsForm settings={settings} />
      ) : read.failed ? (
        <LoadFailed what="the sponsors" onRetry={read.retry} />
      ) : (
        <p className={styles.muted} role="status" aria-busy="true">
          Reading what is saved…
        </p>
      )}
    </div>
  )
}

function SponsorsForm({ settings }: { settings: SiteSettings }) {
  const save = useSaveSettings()
  const [draft, setDraft] = useState<Sponsor[]>(() =>
    settings.sponsors.map((row) => ({ ...row, festivalIds: [...row.festivalIds] })),
  )
  /** Which of the two saves was pressed last, so its own message is the one shown. */
  const [last, setLast] = useState<'switch' | 'list' | null>(null)

  const tidy = tidySponsors(draft)
  const unsaved = JSON.stringify(tidy) !== JSON.stringify(settings.sponsors)
  const on = settings.showSponsors
  const saving = (what: 'switch' | 'list') => save.isPending && last === what
  const said = (what: 'switch' | 'list') =>
    last !== what ? null : save.isError ? (
      <span className={forms.error} role="alert">
        {save.error.message}
      </span>
    ) : save.isSuccess && (what === 'switch' || !unsaved) ? (
      <span className={forms.hint} role="status">
        Saved. The site changes for everybody straight away.
      </span>
    ) : null

  return (
    <>
      <section className={styles.panel} aria-labelledby="sponsors-switch-title">
        <div className={styles.panelHead}>
          <h2 id="sponsors-switch-title" className={styles.panelTitle}>
            On the public site
          </h2>
        </div>
        <div className={`${styles.pad} ${forms.form}`}>
          <p>
            {on ? (
              <>
                <strong>Switched on.</strong> The <Link to="/sponsors">Sponsors page</Link> is in the
                navigation, their logos are on the home page, and “sponsored by” is on their
                festivals’ evenings.
              </>
            ) : (
              <>
                <strong>Switched off.</strong> Nothing below is on the site yet. Get the list right,
                then switch it on.
              </>
            )}
          </p>
          <div className={forms.actions}>
            <Button
              variant={on ? 'line' : 'gold'}
              size="sm"
              disabled={save.isPending}
              onClick={() => {
                setLast('switch')
                // The saved list, not the one being typed: switching on is not a way to publish
                // half an edit.
                save.mutate({ ...settings, showSponsors: !on })
              }}
            >
              {saving('switch') ? 'Saving…' : on ? 'Take them off the website' : 'Show them on the website'}
            </Button>
            {said('switch')}
          </div>
        </div>
      </section>

      <form
        className={styles.panel}
        aria-labelledby="sponsors-list-title"
        onSubmit={(e) => {
          e.preventDefault()
          setLast('list')
          save.mutate({ ...settings, sponsors: tidy })
        }}
      >
        <div className={styles.panelHead}>
          <h2 id="sponsors-list-title" className={styles.panelTitle}>
            The sponsors
          </h2>
          <span className={styles.muted}>
            {sponsorSummary(tidy, on)}
            {unsaved ? ' · unsaved' : ''}
          </span>
        </div>
        <div className={`${styles.pad} ${forms.form}`}>
          <p className={forms.hint}>
            Gold first, then Silver, then Friends, then anybody with no level — each in the order below.
          </p>
          <SponsorsEditor
            rows={draft}
            festivals={settings.festivals}
            onChange={setDraft}
            actions={
              <>
                {said('list')}
                <Button variant="gold" type="submit" size="sm" disabled={save.isPending || !unsaved}>
                  {saving('list') ? 'Saving…' : 'Save the sponsors'}
                </Button>
              </>
            }
          />
        </div>
      </form>
    </>
  )
}
