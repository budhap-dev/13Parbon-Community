import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import styles from './Placeholder.module.css'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <Container className={styles.page}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.text}>Nothing lives at this address. The noticeboard is back on the home page.</p>
      <Button to="/" variant="line">
        Back to the home page
      </Button>
    </Container>
  )
}
