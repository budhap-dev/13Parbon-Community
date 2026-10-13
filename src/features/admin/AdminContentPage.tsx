import { Link, Navigate, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { InfoNote } from '@/components/InfoNote'
import { LoadFailed } from '@/components/LoadFailed'
import { useSaveSettings } from '@/lib/api'
import { useSettings, useSettingsFailed, useSettingsLoaded } from '@/app/SettingsContext'
import { countGaps, gapsNow } from '@/app/gaps'
import { SITE_TEXT_FIELDS, SITE_TEXT_KEYS, type SiteTextKey } from '@/domain/settings'
import styles from '@/features/portal/Portal.module.css'
import { SiteSwitches } from './SiteSwitches'
import { isSectionKey, partOf, sectionHref, type SitePart } from './siteSections'

/**
 * Where on this page a gap can be filled in, if it can.
 *
 * A gap is named by its path in the content — `missionStatement`, or `faq › 4 › answer` —
 * and the box that edits it is named the way the form names it. Nothing on the screen used to
 * connect the two, so "where do I fill this in?" had no answer here.
 */
function fillable(where: string): { href: string; label: string } | null {
  if ((SITE_TEXT_KEYS as readonly string[]).includes(where)) {
    return { href: `#text-${where}`, label: SITE_TEXT_FIELDS[where as SiteTextKey].label }
  }
  // The questions are on the other screen now, so the link opens their section there.
  // The scan numbers list entries from 1, the way a person counts; the form's ids from 0.
  const question = /^faq › (\d+) › (question|answer)$/.exec(where)
  if (question) {
    const n = Number(question[1])
    const field = question[2] === 'question' ? 'Question' : 'Answer'
    return { href: sectionHref('faq'), label: `${field} ${n}` }
  }
  return null
}

/**
 * The public site's settings: what is on, its colours, its single lines, how to reach us and the
 * small print. The content of the Home and About pages is a screen of its own, below.
 *
 * This screen had three tabs — the pages, the noticeboard and the writing — and before that it
 * carried six unrelated jobs on one page. Then it was "Pages and settings", fourteen sections
 * long, and the one somebody wanted was always the eleventh. An address from before, with `?tab=`
 * or a page's `?section=` on it, still arrives at the right screen.
 */
export function AdminContentPage() {
  useDocumentTitle('Site settings')
  const [params] = useSearchParams()
  const moved = { notices: '/admin/notices', writing: '/admin/writing' }[params.get('tab') ?? '']
  if (moved) {
    const open = params.get('open')
    return <Navigate to={open ? `${moved}?open=${encodeURIComponent(open)}` : moved} replace />
  }
  const section = params.get('section')
  if (section && isSectionKey(section) && partOf(section) === 'pages') return <Navigate to={sectionHref(section)} replace />
  return <SiteSettings />
}

/** The Home and About pages: their order, the festivals, the story, the values, the committee. */
export function AdminPagesPage() {
  useDocumentTitle('Home and About pages')
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Home and About pages</h1>
          <p className={styles.sub}>What the two pages say, and the order they say it in.</p>
        </div>
      </div>
      <SettingsForm part="pages" />
    </div>
  )
}

function SiteSettings() {
  const settings = useSettings()
  const gaps = gapsNow(settings)
  const totalGaps = countGaps(gaps)

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Site settings</h1>
          <p className={styles.sub}>What the public site shows, its colours, its words and its small print.</p>
        </div>
      </div>

      <p className={styles.note}>
        {totalGaps === 0 ? (
          <strong>Nothing left in brackets.</strong>
        ) : (
          <>
            <strong>
              {totalGaps} {totalGaps === 1 ? 'gap' : 'gaps'} still showing publicly.
            </strong>{' '}
            Anything written in square brackets is visible to visitors exactly as it appears.
          </>
        )}
      </p>

      <section className={styles.panel} aria-labelledby="pages-title">
        <div className={styles.panelHead}>
          <h2 id="pages-title" className={styles.panelTitle}>
            Pages
          </h2>
          <span className={`${styles.muted} ${styles.tiny}`}>Counted from the pages themselves</span>
        </div>
        <div className={styles.scroll}>
          <table className={`${styles.table} ${styles.cardsOnPhone}`}>
            <thead>
              <tr>
                <th>Page</th>
                <th>What is left in brackets</th>
                <th>Unfilled gaps</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap) => (
                <tr key={gap.page}>
                  <td data-label="Page">
                    <strong>{gap.page}</strong>
                  </td>
                  <td data-label="Left in brackets" className={`${styles.muted} ${styles.tiny}`}>
                    {/* Which ones, not just how many, and a link to the box that edits each one
                        under the name that box uses rather than the key in the code. */}
                    <span>
                    {gap.where.length === 0
                      ? 'Nothing in brackets'
                      : gap.where.map((where, i) => (
                          <span key={where}>
                            {i > 0 ? ', ' : ''}
                            {(() => {
                              const box = fillable(where)
                              return !box ? (
                                where
                              ) : box.href.startsWith('#') ? (
                                <a href={box.href} className={styles.inlineLink}>
                                  {box.label}
                                </a>
                              ) : (
                                <Link to={box.href} className={styles.inlineLink}>
                                  {box.label}
                                </Link>
                              )
                            })()}
                          </span>
                        ))}
                    </span>
                  </td>
                  <td data-label="Gaps">
                    <span className={gap.where.length > 0 ? styles.pillWait : styles.pillLive}>
                      {gap.where.length > 0 ? `${gap.where.length} to fill in` : 'Done'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SettingsForm part="site" />
    </div>
  )
}

/**
 * The form, not until what is saved has been read.
 *
 * The form copies the settings when it opens and edits the copy. Opened a moment too early — a
 * reload of this page, before the database has answered — the copy is of what the code says,
 * every section that differs lights up as unsaved, and pressing its Save writes the code's
 * version over the committee's.
 */
function SettingsForm({ part }: { part: SitePart }) {
  const settings = useSettings()
  const settingsLoaded = useSettingsLoaded()
  const settingsRead = useSettingsFailed()
  const saveSettings = useSaveSettings()
  return (
    <section className={styles.panel} aria-labelledby="switches-title">
      <div className={styles.panelHead}>
        <h2 id="switches-title" className={styles.panelTitle}>
          {part === 'site' ? 'What the site shows' : 'What the pages say'}
        </h2>
      </div>
      <div className={styles.pad}>
        <InfoNote summary="Each section saves on its own">
          <p>
            Everything here is the committee’s to decide, and each of these once needed a developer.
            A section’s Save saves only that section, so something half-written further down the page
            stays half-written until you save it.
          </p>
        </InfoNote>
        <div style={{ marginTop: 16 }}>
          {settingsLoaded ? (
            <SiteSwitches
              part={part}
              settings={settings}
              saving={saveSettings.isPending}
              saved={saveSettings.isSuccess}
              error={saveSettings.isError ? saveSettings.error.message : undefined}
              onSave={(draft) => saveSettings.mutate(draft)}
            />
          ) : settingsRead.failed ? (
            // Still no form: opened on the fallback, its Save would write the code's version over
            // the committee's.
            <LoadFailed what="what is saved" onRetry={settingsRead.retry} />
          ) : (
            <p className={styles.muted} role="status" aria-busy="true">
              Reading what is saved…
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
