import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import styles from './Placeholder.module.css'

export function ComingSoonPage({ title }: { title: string }) {
  useDocumentTitle(title)
  return (
    <Container className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.text}>This page is on its way. Come back after the next festival.</p>
      <Button to="/" variant="line">
        Back to the home page
      </Button>
    </Container>
  )
}
