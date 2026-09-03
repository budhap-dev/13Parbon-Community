import { Link, useParams } from 'react-router'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import { formatLongDate } from '@/domain/dates'
import { paragraphs } from '@/domain/news'
import { NotFoundPage } from '@/features/placeholder'
import { useNewsPost } from '@/lib/api'
import styles from './News.module.css'

export function ArticlePage() {
  const { slug = '' } = useParams()
  const { data: post, isPending } = useNewsPost(slug)
  useDocumentTitle(post?.title)

  if (isPending) {
    return (
      <Container className={styles.article}>
        <p aria-busy="true">Loading…</p>
      </Container>
    )
  }
  if (!post) return <NotFoundPage />

  return (
    <Container className={styles.article}>
      <Link to="/news" className={styles.crumb}>
        ← All news
      </Link>
      <p className={styles.postMeta}>
        <span>{formatLongDate(post.publishedAt)}</span>
        <span>{post.author}</span>
        {post.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </p>
      <h1 className={styles.articleTitle}>{post.title}</h1>
      <div className={styles.articleBody}>
        {paragraphs(post.body).map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
    </Container>
  )
}
