import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { formatDateWithYear } from '@/domain/dates'
import { useAlbums, useNewsletters, useNewsPosts } from '@/lib/api'
import styles from '@/features/portal/Portal.module.css'

/** Gaps the committee still has to fill, counted from the content files. */
const gaps = [
  { page: 'Home page', detail: 'headline, who we are, join box', count: 7 },
  { page: 'About us', detail: 'story, committee names, FAQ', count: 13 },
  { page: 'Privacy', detail: 'legal name, review date', count: 4 },
]

export function AdminContentPage() {
  useDocumentTitle('Content')
  const { data: posts } = useNewsPosts()
  const { data: albums } = useAlbums()
  const { data: newsletters } = useNewsletters()
  const totalGaps = gaps.reduce((n, g) => n + g.count, 0)

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Content</h1>
          <p className={styles.sub}>Everything the public sees. Publish when you are ready, not before.</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => {}}>
          Write something
        </Button>
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

      <div className={styles.two}>
        <section className={styles.panel} aria-labelledby="news-title">
          <div className={styles.panelHead}>
            <h2 id="news-title" className={styles.panelTitle}>
              News
            </h2>
            <Button variant="line" size="sm" onClick={() => {}}>
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
                </tr>
              </thead>
              <tbody>
                {(posts ?? []).map((post) => (
                  <tr key={post.id}>
                    <td>
                      <strong>{post.title}</strong>
                      <br />
                      <span className={`${styles.muted} ${styles.tiny}`}>
                        {formatDateWithYear(post.publishedAt)} · {post.author}
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
                      <span className={styles.pillLive}>Published</span>
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
