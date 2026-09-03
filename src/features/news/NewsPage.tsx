import { Link, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { formatLongDate } from '@/domain/dates'
import { useAnnouncements, useNewsletters, useNewsPosts } from '@/lib/api'
import styles from './News.module.css'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function NewsPage() {
  useDocumentTitle('News & announcements')
  const [params] = useSearchParams()
  const tag = params.get('tag')
  const { data: announcements } = useAnnouncements()
  const { data: posts, isPending } = useNewsPosts()
  const { data: newsletters } = useNewsletters()

  const tags = [...new Set((posts ?? []).flatMap((p) => p.tags))].sort()
  const shown = (posts ?? []).filter((p) => !tag || p.tags.includes(tag))

  return (
    <Container className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>News &amp; announcements</h1>
        <p className={styles.intro}>Short, pinned, and impossible to miss. What the committee wants every household to know.</p>
      </header>

      {announcements && announcements.length > 0 ? (
        <section className={styles.notices} aria-label="Announcements">
          {announcements.map((a) => (
            <article key={a.id} className={a.pinned ? styles.noticePinned : styles.notice}>
              <Icon name="megaphone" className={styles.noticeIcon} />
              <div className={styles.noticeBody}>
                <h2 className={styles.noticeTitle}>{a.title}</h2>
                <p className={styles.noticeText}>{a.body}</p>
              </div>
              {a.link ? (
                <Button to={a.link.to} variant={a.pinned ? 'gold' : 'line'} size="sm">
                  {a.link.label}
                </Button>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.posts} aria-labelledby="posts-title">
          <h2 id="posts-title" className={styles.sideTitle}>
            Latest
          </h2>
          {tags.length > 0 ? (
            <nav className={styles.filters} aria-label="Filter by topic">
              <Link to="/news" className={tag ? styles.filter : styles.filterActive} aria-current={tag ? undefined : 'true'}>
                All
              </Link>
              {tags.map((t) => (
                <Link
                  key={t}
                  to={`/news?tag=${encodeURIComponent(t)}`}
                  className={t === tag ? styles.filterActive : styles.filter}
                  aria-current={t === tag ? 'true' : undefined}
                >
                  {t}
                </Link>
              ))}
            </nav>
          ) : null}
          {isPending ? (
            <p className={styles.empty} aria-busy="true">
              Loading…
            </p>
          ) : shown.length === 0 ? (
            <p className={styles.empty}>Nothing here yet.</p>
          ) : (
            shown.map((post) => (
              <article key={post.id} className={styles.post}>
                <p className={styles.postMeta}>
                  <span>{formatDate(post.publishedAt)}</span>
                  {post.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </p>
                <h3 className={styles.postTitle}>
                  <Link to={`/news/${post.slug}`} className={styles.postLink}>
                    {post.title}
                  </Link>
                </h3>
                <p className={styles.postExcerpt}>{post.excerpt}</p>
              </article>
            ))
          )}
        </section>

        <aside className={styles.side}>
          {newsletters && newsletters.length > 0 ? (
            <section className={styles.sideBlock} aria-labelledby="newsletters-title">
              <h2 id="newsletters-title" className={styles.sideTitle}>
                Newsletters
              </h2>
              <ul>
                {newsletters.map((n) => (
                  <li key={n.id} className={styles.newsletter}>
                    <a href={n.fileUrl}>{n.title}</a>
                    <span className={styles.newsletterDate}>{formatLongDate(n.issuedOn)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className={styles.sideBlock} aria-labelledby="contact-title">
            <h2 id="contact-title" className={styles.sideTitle}>
              Got news for us?
            </h2>
            <p className={styles.postExcerpt}>A story from an event, a photo, a thank you. Send it to the committee.</p>
            <Button to="/contact" variant="line" size="sm">
              Contact us
            </Button>
          </section>
        </aside>
      </div>
    </Container>
  )
}
