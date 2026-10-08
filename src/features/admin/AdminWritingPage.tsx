import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { LoadFailed } from '@/components/LoadFailed'
import { formatDateWithYear } from '@/domain/dates'
import type { NewsPost } from '@/domain/news'
import { useAllPosts, useCreatePost, useNewsletters, useRemovePost, useUpdatePost } from '@/lib/api'
import styles from '@/features/portal/Portal.module.css'
import { NewsForm } from './ContentForms'

/**
 * The news pieces and the newsletters: the writing that goes on the News page.
 *
 * A screen of its own. It was a tab of Content, and the newsletters sat further down a different
 * tab of the same screen — the two halves of the News page in two places, neither of them where
 * somebody with a piece to put up would look first.
 */
export function AdminWritingPage() {
  useDocumentTitle('Writing')
  const postsQuery = useAllPosts()
  const newslettersQuery = useNewsletters()
  const posts = postsQuery.data
  const newsletters = newslettersQuery.data
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()
  const removePost = useRemovePost()

  /** What just happened, said out loud: saved, and whether it is on the website. */
  const [posted, setPosted] = useState<string | null>(null)
  /** Which piece is being asked about, if any. */
  const [deleting, setDeleting] = useState<string | null>(null)
  /** The form, when it is open: a new piece, or one being edited. */
  const [editing, setEditing] = useState<{ post?: NewsPost } | null>(null)
  // Opening or leaving the form replaces the page without changing the address.
  useScrollToTopOn(editing)
  // `?open=` names a piece, from the portal's search.
  useOpenFromAddress(
    posts?.map((post) => ({ id: post.id, post })),
    (item) => {
      setPosted(null)
      setEditing({ post: item.post })
    },
  )

  const done = (post: NewsPost) => {
    setPosted(post.publishedAt && !post.hidden ? 'Saved. It is on the website.' : 'Saved. It is not on the website yet.')
    setEditing(null)
  }

  if (editing) {
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>{editing.post ? 'Edit the piece' : 'Write something'}</h1>
            <p className={styles.sub}>Nothing goes on the website until you say so, and taking it off again keeps the writing.</p>
          </div>
          {/* A way out that does not require reading to the end of a long form. */}
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
                  ? updatePost.mutate({ id: editing.post.id, draft }, { onSuccess: done })
                  : createPost.mutate(draft, { onSuccess: done })
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
          <h1 className={styles.title}>Writing</h1>
          <p className={styles.sub}>News pieces and newsletters, for the News page. Publish when you are ready, not before.</p>
        </div>
      </div>

      {posted ? (
        <p className={styles.said} role="status">
          {posted}
        </p>
      ) : null}

      <section className={styles.panel} aria-labelledby="news-title">
        <div className={styles.panelHead}>
          <h2 id="news-title" className={styles.panelTitle}>
            News
          </h2>
          <Button variant="gold" size="sm" onClick={() => setEditing({})}>
            Write something
          </Button>
        </div>
        {postsQuery.isPending ? (
          <p className={styles.empty} aria-busy="true">
            Loading…
          </p>
        ) : postsQuery.isError ? (
          <div className={styles.pad}>
            <LoadFailed what="the writing" onRetry={() => void postsQuery.refetch()} />
          </div>
        ) : !posts?.length ? (
          <p className={styles.empty}>Nothing written yet. Write something to start the news page.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Written by</th>
                  <th>Tags</th>
                  <th>Status</th>
                  <th className={styles.right}>
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <strong>{post.title}</strong>
                      <br />
                      <span className={`${styles.muted} ${styles.tiny}`}>
                        {post.publishedAt ? formatDateWithYear(post.publishedAt) : 'Not published'}
                      </span>
                    </td>
                    <td className={styles.tiny}>{post.author}</td>
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
                      <span className={!post.publishedAt ? styles.pillWait : post.hidden ? styles.pillPast : styles.pillLive}>
                        {/* Never up is a draft; up and then off is taken down. Not the same thing. */}
                        {!post.publishedAt ? 'Draft' : post.hidden ? 'Taken down' : 'Published'}
                      </span>
                    </td>
                    <td className={styles.right}>
                      <span className={`${styles.actions} ${styles.actionsRight}`}>
                        <Button variant="line" size="sm" aria-label={`Edit ${post.title}`} onClick={() => setEditing({ post })}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" aria-label={`Delete ${post.title}`} onClick={() => setDeleting(post.id)}>
                          <Icon name="trash" size={15} />
                        </Button>
                        <ConfirmDialog
                          open={deleting === post.id}
                          title="Delete this piece?"
                          confirmLabel="Delete"
                          busyLabel="Deleting…"
                          busy={removePost.isPending}
                          error={removePost.isError ? removePost.error.message : undefined}
                          onCancel={() => setDeleting(null)}
                          onConfirm={() =>
                            removePost.mutate(post.id, {
                              onSuccess: () => {
                                setDeleting(null)
                                setPosted('Deleted. The trail keeps its title and the date it went up.')
                              },
                            })
                          }
                        >
                          <strong>{post.title}</strong> and its writing go for good. To take it off the
                          website and keep it — the usual way — edit it and turn <em>On the website</em>{' '}
                          off instead.
                        </ConfirmDialog>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="newsletters-title">
        <div className={styles.panelHead}>
          <h2 id="newsletters-title" className={styles.panelTitle}>
            Newsletters
          </h2>
        </div>
        {newslettersQuery.isPending ? (
          <p className={styles.empty} aria-busy="true">
            Loading…
          </p>
        ) : newslettersQuery.isError ? (
          <div className={styles.pad}>
            <LoadFailed what="the newsletters" onRetry={() => void newslettersQuery.refetch()} />
          </div>
        ) : !newsletters?.length ? (
          <p className={styles.empty}>No newsletters yet.</p>
        ) : (
          <div className={styles.list}>
            {newsletters.map((n) => (
              <div key={n.id} className={styles.listItem}>
                <div className={styles.listBody}>
                  <strong>{n.title}</strong>
                  <span className={`${styles.muted} ${styles.tiny}`}>{formatDateWithYear(n.issuedOn)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
