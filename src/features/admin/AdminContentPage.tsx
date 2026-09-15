import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
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
import styles from '@/features/portal/Portal.module.css'
import { AnnouncementForm, NewsForm } from './ContentForms'
import { SiteSwitches } from './SiteSwitches'

/** Gaps the committee still has to fill, counted from the content files. */
const gaps = [
  { page: 'Home page', detail: 'headline, who we are, join box', count: 7 },
  { page: 'About us', detail: 'story, committee names, FAQ', count: 13 },
  { page: 'Privacy', detail: 'legal name, review date', count: 4 },
]

export function AdminContentPage() {
  useDocumentTitle('Content')
  const { data: posts } = useAllPosts()
  const { data: announcements } = useAllAnnouncements()
  const { data: albums } = useAlbums()
  const { data: newsletters } = useNewsletters()
  const totalGaps = gaps.reduce((n, g) => n + g.count, 0)

  const createPost = useCreatePost()
  const updatePost = useUpdatePost()
  const createNotice = useCreateAnnouncement()
  const updateNotice = useUpdateAnnouncement()
  const removeNotice = useRemoveAnnouncement()
  const settings = useSettings()
  const saveSettings = useSaveSettings()
  // Read once per render: the same instant should decide every row, or a notice could read as
  // both waiting and finished in one table.
  const at = useNow().toISOString()

  /** Which form is open: nothing, a new one, or an existing piece or notice. */
  const [editing, setEditing] = useState<
    { kind: 'post'; post?: NewsPost } | { kind: 'notice'; notice?: Announcement } | null
  >(null)

  if (editing?.kind === 'post') {
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>{editing.post ? 'Edit the piece' : 'Write something'}</h1>
            <p className={styles.sub}>
              Nothing goes on the website until you say so, and taking it off again keeps the writing.
            </p>
          </div>
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
      </div>
    )
  }

  if (editing?.kind === 'notice') {
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>{editing.notice ? 'Edit the notice' : 'Put up a notice'}</h1>
            <p className={styles.sub}>
              Short, and few. A noticeboard people can read at a glance is the whole point of it.
            </p>
          </div>
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
                  ? updateNotice.mutate({ id: editing.notice.id, draft }, { onSuccess: () => setEditing(null) })
                  : createNotice.mutate(draft, { onSuccess: () => setEditing(null) })
              }
            />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Content</h1>
          <p className={styles.sub}>Everything the public sees. Publish when you are ready, not before.</p>
        </div>
        <span className={styles.actions}>
          <Button variant="line" size="sm" onClick={() => setEditing({ kind: 'notice' })}>
            Put up a notice
          </Button>
          <Button variant="gold" size="sm" onClick={() => setEditing({ kind: 'post' })}>
            Write something
          </Button>
        </span>
      </div>

      <p className={styles.note}>
        <strong>{totalGaps} gaps still showing publicly.</strong> Anything written in square brackets is visible to
        visitors exactly as it appears in the content files.
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
                  <td className={`${styles.muted} ${styles.tiny}`}>{gap.detail}</td>
                  <td>
                    <span className={styles.pillWait}>{gap.count} to fill in</span>
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
                          variant="line"
                          size="sm"
                          aria-label={`Take ${notice.title} off the board`}
                          disabled={removeNotice.isPending}
                          onClick={() => removeNotice.mutate(notice.id)}
                        >
                          Take off
                        </Button>
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

      <div className={styles.two}>
        <section className={styles.panel} aria-labelledby="news-title">
          <div className={styles.panelHead}>
            <h2 id="news-title" className={styles.panelTitle}>
              News
            </h2>
            <Button variant="line" size="sm" onClick={() => setEditing({ kind: 'post' })}>
              New article
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

        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="albums-title">
            <div className={styles.panelHead}>
              <h2 id="albums-title" className={styles.panelTitle}>
                Photo albums
              </h2>
              <Button variant="line" size="sm" onClick={() => {}}>
                New album
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
      </div>
    </div>
  )
}
