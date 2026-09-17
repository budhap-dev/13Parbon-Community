import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { formatLongDate } from '@/domain/dates'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDateWithYear } from '@/domain/dates'
import { isLive, type Announcement, type NewsPost } from '@/domain/news'
import {
  useAlbums,
  useAllAnnouncements,
  useAllPosts,
  useCreateAnnouncement,
  useCreatePost,
  useNewsletters,
  useRemoveAnnouncement,
  useUpdateAnnouncement,
  useUpdatePost,
  useSaveSettings,
} from '@/lib/api'
import { useNow } from '@/lib/clock'
import { useSettings } from '@/app/SettingsContext'
import { countGaps, gapsNow } from '@/app/gaps'
import { SITE_TEXT_FIELDS, SITE_TEXT_KEYS, type SiteTextKey } from '@/domain/settings'
import styles from '@/features/portal/Portal.module.css'
import { AnnouncementForm, NewsForm } from './ContentForms'
import { SiteSwitches } from './SiteSwitches'

type Tab = 'content' | 'notices' | 'writing'

/**
 * Three things, three tabs.
 *
 * This screen carried six unrelated jobs at once — the site's wording, its switches, the
 * noticeboard, the writing, the albums and the newsletters — and opening any form replaced the
 * lot. Splitting it is not decoration: it is what makes "save this and let me carry on where I
 * was" possible at all.
 */
const TABS: { key: Tab; label: string }[] = [
  { key: 'content', label: 'The pages' },
  { key: 'notices', label: 'Noticeboard' },
  { key: 'writing', label: 'Writing' },
]

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

export function AdminContentPage() {
  useDocumentTitle('Content')
  const settings = useSettings()
  const { data: posts } = useAllPosts()
  const { data: announcements } = useAllAnnouncements()
  const { data: albums } = useAlbums()
  const { data: newsletters } = useNewsletters()
  const gaps = gapsNow(settings)
  const totalGaps = countGaps(gaps)

  const createPost = useCreatePost()
  const updatePost = useUpdatePost()
  const createNotice = useCreateAnnouncement()
  const updateNotice = useUpdateAnnouncement()
  const removeNotice = useRemoveAnnouncement()
  const saveSettings = useSaveSettings()
  // Read once per render: the same instant should decide every row, or a notice could read as
  // both waiting and finished in one table.
  const at = useNow().toISOString()

  /**
   * What just happened, said out loud.
   *
   * Putting a notice up closed the form and returned you to this page, and that was the whole
   * of the feedback: no word that it had saved, and nothing about where it had gone. A notice
   * for members and a notice that starts next Tuesday both look exactly like one that is on the
   * website this second — so the only way to find out was to go and look somewhere else, and
   * if it was not there, to guess why.
   */
  const [posted, setPosted] = useState<string | null>(null)
  /*
   * Which notice is being asked about.
   *
   * Taking one off went straight through — one press and it was gone. Unlike a news piece, which
   * is unpublished and keeps its writing, a notice is deleted outright: the contract says as
   * much, that there is no version of it worth keeping once it stops being true. So it was the
   * one irreversible thing on this screen with nothing between it and a misplaced click.
   */
  const [removing, setRemoving] = useState<string | null>(null)

  /*
   * Which tab, kept in the address rather than in state.
   *
   * So that saving a notice leaves you looking at notices, a reload does not throw you back to
   * the beginning, and the browser's own Back works between the three. This screen carried six
   * unrelated things on one page — the site's wording, its switches, the noticeboard, the
   * writing, the albums and the newsletters — and putting up a notice replaced all of it.
   */
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.some((t) => t.key === params.get('tab')) ? (params.get('tab') as Tab) : 'content'
  const showTab = (next: Tab) => {
    const now = new URLSearchParams(params)
    now.set('tab', next)
    setParams(now, { replace: true })
    // A form belongs to the tab it was opened from; leaving the tab closes it.
    setEditing(null)
    setPosted(null)
  }

  const whereItWent = (notice: Announcement): string => {
    const where = notice.audience === 'public' ? 'on the website' : 'in the portal, to members'
    if (notice.publishAt > at) return `Saved. It goes up ${where} on ${formatLongDate(notice.publishAt)}.`
    if (notice.expiresAt && notice.expiresAt <= at) return 'Saved — but the take-down date has already passed, so nobody will see it.'
    return `Up now, ${where}.`
  }

  /** Which form is open: nothing, a new one, or an existing piece or notice. */
  const [editing, setEditing] = useState<
    { kind: 'post'; post?: NewsPost } | { kind: 'notice'; notice?: Announcement } | null
  >(null)
  // Opening or leaving a form replaces the page without changing the address.
  useScrollToTopOn(editing)

  const postForm =
    editing?.kind === 'post' ? (
      <>
        <div className={styles.top}>
          <div>
            <h2 className={styles.panelTitle}>{editing.post ? 'Edit the piece' : 'Write something'}</h2>
            <p className={styles.sub}>
              Nothing goes on the website until you say so, and taking it off again keeps the writing.
            </p>
          </div>
          {/*
            * A way out that does not require reading to the end of the form.
            *
            * Cancel is at the foot of it, which is the right place for the button that abandons
            * what you have typed — but it is not a way back, and it is below the fold on a long
            * form. Somebody who opened this to look rather than to write had nothing at the top
            * to leave by, and the browser's own Back goes out of the screen entirely, because
            * the form is a state of this page rather than a page of its own.
            */}
          <span className={styles.actions}>
            <Button variant="line" size="sm" onClick={() => setEditing(null)}>
              Back to the list
            </Button>
          </span>
        </div>
        <section className={styles.panel}>
          <div className={styles.pad}>
            <NewsForm
              post={editing.post}
              saving={createPost.isPending || updatePost.isPending}
              error={createPost.isError ? createPost.error.message : updatePost.isError ? updatePost.error.message : undefined}
              onCancel={() => setEditing(null)}
              onSave={(draft) =>
                editing.post
                  ? updatePost.mutate({ id: editing.post.id, draft }, { onSuccess: () => setEditing(null) })
                  : createPost.mutate(draft, { onSuccess: () => setEditing(null) })
              }
            />
          </div>
        </section>
      </>
    ) : null

  const noticeForm =
    editing?.kind === 'notice' ? (
      <>
        <div className={styles.top}>
          <div>
            <h2 className={styles.panelTitle}>{editing.notice ? 'Edit the notice' : 'Put up a notice'}</h2>
            <p className={styles.sub}>
              Short, and few. A noticeboard people can read at a glance is the whole point of it.
            </p>
          </div>
          <span className={styles.actions}>
            <Button variant="line" size="sm" onClick={() => setEditing(null)}>
              Back to the list
            </Button>
          </span>
        </div>
        <section className={styles.panel}>
          <div className={styles.pad}>
            <AnnouncementForm
              announcement={editing.notice}
              saving={createNotice.isPending || updateNotice.isPending}
              error={createNotice.isError ? createNotice.error.message : updateNotice.isError ? updateNotice.error.message : undefined}
              onCancel={() => setEditing(null)}
              onSave={(draft) =>
                editing.notice
                  ? updateNotice.mutate(
                      { id: editing.notice.id, draft },
                      { onSuccess: (notice) => { setPosted(whereItWent(notice)); setEditing(null) } },
                    )
                  : createNotice.mutate(draft, {
                      onSuccess: (notice) => { setPosted(whereItWent(notice)); setEditing(null) },
                    })
              }
            />
          </div>
        </section>
      </>
    ) : null

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Content</h1>
          <p className={styles.sub}>Everything the public sees. Publish when you are ready, not before.</p>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Content">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            className={tab === t.key ? styles.tabOn : styles.tab}
            onClick={() => showTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className={styles.page}>
      {posted ? (
        <p className={styles.said} role="status">
          {posted}
        </p>
      ) : null}

      {tab === 'content' ? (
        <>
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
            These were a code change until now — a pull request and a deploy to turn the gallery
            off. They are yours.
          </p>
          <SiteSwitches
            settings={settings}
            saving={saveSettings.isPending}
            saved={saveSettings.isSuccess}
            error={saveSettings.isError ? saveSettings.error.message : undefined}
            onSave={(draft) => saveSettings.mutate(draft)}
          />
        </div>
      </section>

        <div className={styles.stack}>
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
                  {(albums ?? []).map((album) => (
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
          </section>

          <section className={styles.panel} aria-labelledby="newsletters-title">
            <div className={styles.panelHead}>
              <h2 id="newsletters-title" className={styles.panelTitle}>
                Newsletters
              </h2>
            </div>
            <div className={styles.list}>
              {(newsletters ?? []).map((n) => (
                <div key={n.id} className={styles.listItem}>
                  <div className={styles.listBody}>
                    <strong>{n.title}</strong>
                    <span className={`${styles.muted} ${styles.tiny}`}>{formatDateWithYear(n.issuedOn)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        </>
      ) : null}

      {tab === 'notices' ? (
        noticeForm ?? (
      <section className={styles.panel} aria-labelledby="notices-title">
        <div className={styles.panelHead}>
          <h2 id="notices-title" className={styles.panelTitle}>
            The noticeboard
          </h2>
          <Button variant="line" size="sm" onClick={() => setEditing({ kind: 'notice' })}>
            Put up a notice
          </Button>
        </div>
        {!announcements?.length ? (
          <p className={styles.empty}>Nothing on the board.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Who sees it</th>
                  <th>Showing</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((notice) => (
                  <tr key={notice.id}>
                    <td>
                      <strong>{notice.pinned ? '📌 ' : ''}{notice.title}</strong>
                      <br />
                      <span className={`${styles.muted} ${styles.tiny}`}>{notice.body}</span>
                    </td>
                    <td className={styles.muted}>{notice.audience === 'public' ? 'Anybody' : 'Members'}</td>
                    <td>
                      <span className={isLive(notice, at) ? styles.pillLive : styles.pillWait}>
                        {isLive(notice, at) ? 'On the board' : notice.publishAt > at ? 'Waiting' : 'Finished'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.actions}>
                        <Button
                          variant="line"
                          size="sm"
                          aria-label={`Edit ${notice.title}`}
                          onClick={() => setEditing({ kind: 'notice', notice })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          aria-label={`Take ${notice.title} off the board`}
                          onClick={() => setRemoving(notice.id)}
                        >
                          Take off
                        </Button>
                        <ConfirmDialog
                          open={removing === notice.id}
                          title="Take this notice off the board?"
                          confirmLabel="Take it off"
                          busyLabel="Removing…"
                          busy={removeNotice.isPending}
                          error={removeNotice.isError ? removeNotice.error.message : undefined}
                          onCancel={() => setRemoving(null)}
                          onConfirm={() =>
                            removeNotice.mutate(notice.id, {
                              onSuccess: () => {
                                setRemoving(null)
                                setPosted('Taken off the board. A notice has no version worth keeping, so it is gone.')
                              },
                            })
                          }
                        >
                          <strong>{notice.title}</strong> goes for good. A notice has no version worth
                          keeping, so there is nothing to put back.
                        </ConfirmDialog>
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
            A notice taken off the board is gone — there is no version of it worth keeping once it has
            stopped being true. A news piece is different: that is unpublished, and the writing stays.
          </p>
        </div>
      </section>

        )
      ) : null}

      {tab === 'writing' ? (
        postForm ?? (
        <section className={styles.panel} aria-labelledby="news-title">
          <div className={styles.panelHead}>
            <h2 id="news-title" className={styles.panelTitle}>
              News
            </h2>
            <Button variant="gold" size="sm" onClick={() => setEditing({ kind: 'post' })}>
              Write something
            </Button>
          </div>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Tags</th>
                  <th>Status</th>
                  <th><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody>
                {(posts ?? []).map((post) => (
                  <tr key={post.id}>
                    <td>
                      <strong>{post.title}</strong>
                      <br />
                      <span className={`${styles.muted} ${styles.tiny}`}>
                        {post.publishedAt ? formatDateWithYear(post.publishedAt) : 'Not published'} · {post.author}
                      </span>
                    </td>
                    <td>
                      <ul className={styles.chips}>
                        {post.tags.map((tag) => (
                          <li key={tag} className={styles.pill}>
                            {tag}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <span
                        className={
                          !post.publishedAt ? styles.pillWait : post.hidden ? styles.pillPast : styles.pillLive
                        }
                      >
                        {/* Never up is a draft; up and then off is taken down. Not the same thing. */}
                        {!post.publishedAt ? 'Draft' : post.hidden ? 'Taken down' : 'Published'}
                      </span>
                    </td>
                    <td>
                      <Button
                        variant="line"
                        size="sm"
                        aria-label={`Edit ${post.title}`}
                        onClick={() => setEditing({ kind: 'post', post })}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )
      ) : null}
      </div>
    </div>
  )
}
