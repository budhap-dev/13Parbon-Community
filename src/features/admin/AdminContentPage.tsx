import { Navigate, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { LoadFailed } from '@/components/LoadFailed'
import { useAlbums, useSaveSettings } from '@/lib/api'
import { useSettings, useSettingsFailed, useSettingsLoaded } from '@/app/SettingsContext'
import { countGaps, gapsNow } from '@/app/gaps'
import { SITE_TEXT_FIELDS, SITE_TEXT_KEYS, type SiteTextKey } from '@/domain/settings'
import styles from '@/features/portal/Portal.module.css'
import { SiteSwitches } from './SiteSwitches'

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
  // The scan numbers list entries from 1, the way a person counts; the form's ids from 0.
  const question = /^faq › (\d+) › (question|answer)$/.exec(where)
  if (question) {
    const n = Number(question[1])
    const field = question[2] === 'question' ? 'Question' : 'Answer'
    return { href: `#${question[2]}-${n - 1}`, label: `${field} ${n}` }
  }
  return null
}

/**
 * The public site's wording, switches and lists: what is on, what it says, what order it comes
 * in and what colours it wears.
 *
 * This screen had three tabs — the pages, the noticeboard and the writing — and before that it
 * carried six unrelated jobs on one page. The noticeboard and the writing are screens of their
 * own now, in the sidebar, and so are the sponsors. An address from before, with `?tab=` on it,
 * still arrives at the right one.
 */
export function AdminContentPage() {
  useDocumentTitle('Pages and settings')
  const [params] = useSearchParams()
  const moved = { notices: '/admin/notices', writing: '/admin/writing' }[params.get('tab') ?? '']
  if (moved) {
    const open = params.get('open')
    return <Navigate to={open ? `${moved}?open=${encodeURIComponent(open)}` : moved} replace />
  }
  return <SitePages />
}

function SitePages() {
  const settings = useSettings()
  const settingsLoaded = useSettingsLoaded()
  const settingsRead = useSettingsFailed()
  const albumsQuery = useAlbums()
  const albums = albumsQuery.data
  const gaps = gapsNow(settings)
  const totalGaps = countGaps(gaps)
  const saveSettings = useSaveSettings()

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Pages and settings</h1>
          <p className={styles.sub}>The words on the public pages, what is switched on, and the lists behind them.</p>
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
        )}{' '}
        Counted from the pages themselves, so this cannot go stale.
      </p>

      <section className={styles.panel} aria-labelledby="pages-title">
        <div className={styles.panelHead}>
          <h2 id="pages-title" className={styles.panelTitle}>
            Pages
          </h2>
          <span className={`${styles.muted} ${styles.tiny}`}>The wording on the public site</span>
        </div>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Page</th>
                <th>What it covers</th>
                <th>Unfilled gaps</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap) => (
                <tr key={gap.page}>
                  <td>
                    <strong>{gap.page}</strong>
                  </td>
                  <td className={`${styles.muted} ${styles.tiny}`}>
                    {/* Which ones, not just how many. "13 to fill in" sends somebody looking
                        through a file; naming them sends them to the line.

                        And where one of them is a line the committee can edit, it is a link to
                        the box that edits it, under the name that box uses. `missionStatement`
                        is the key in the code; "Mission and vision" is what the form calls it,
                        and somebody reading this table had no way to connect the two. */}
                    {gap.where.length === 0
                      ? 'Nothing in brackets'
                      : gap.where.map((where, i) => (
                          <span key={where}>
                            {i > 0 ? ', ' : ''}
                            {(() => {
                              const box = fillable(where)
                              return box ? (
                                <a href={box.href} className={styles.inlineLink}>
                                  {box.label}
                                </a>
                              ) : (
                                where
                              )
                            })()}
                          </span>
                        ))}
                  </td>
                  <td>
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

      <section className={styles.panel} aria-labelledby="switches-title">
        <div className={styles.panelHead}>
          <h2 id="switches-title" className={styles.panelTitle}>
            What the site shows
          </h2>
        </div>
        <div className={styles.pad}>
          <p className={`${styles.muted} ${styles.tiny}`} style={{ marginBottom: 16 }}>
            Everything about the public site that is the committee’s to decide: what is switched
            on, what it says, what order it comes in and what colours it wears. Each of these was
            a code change once — a pull request and a deploy to turn the gallery off. They are yours.
          </p>
          {/*
            * Not until what is saved has been read.
            *
            * The form copies the settings when it opens and edits the copy. Opened a moment too
            * early — a reload of this page, before the database has answered — the copy is of
            * what the code says, every section that differs lights up as unsaved, and pressing
            * its Save writes the code's version over the committee's. With the story and the
            * privacy notice now in here, that is too much to lose to a race.
            */}
          {settingsLoaded ? (
            <SiteSwitches
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
      </section>

      <section className={styles.panel} aria-labelledby="albums-title">
        <div className={styles.panelHead}>
          <h2 id="albums-title" className={styles.panelTitle}>
            Photo albums
          </h2>
          {/*
            * Went to the Photographs screen, rather than nowhere.
            *
            * This panel is a summary: albums are made and filled on /admin/media, which is
            * where the upload and the takedown live. The button had an empty handler, so it
            * looked like the way to make an album and was the one control on this page that
            * did nothing at all when pressed.
            */}
          <Button variant="line" size="sm" to="/admin/media">
            Photographs
          </Button>
        </div>
        {albumsQuery.isPending ? (
          <p className={styles.empty} aria-busy="true">
            Loading…
          </p>
        ) : albumsQuery.isError ? (
          <div className={styles.pad}>
            <LoadFailed what="the albums" onRetry={() => void albumsQuery.refetch()} />
          </div>
        ) : !albums?.length ? (
          <p className={styles.empty}>No albums on the website yet.</p>
        ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Album</th>
                <th>Photos</th>
                <th>Who sees it</th>
              </tr>
            </thead>
            <tbody>
              {albums.map((album) => (
                <tr key={album.id}>
                  <td>
                    <strong>{album.title}</strong>
                  </td>
                  <td className={styles.num}>{album.media.length}</td>
                  <td>
                    <span className={styles.pill}>Everyone</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </div>
  )
}
