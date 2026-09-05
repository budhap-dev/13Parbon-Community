import { Link } from 'react-router'
import { privacy } from '@/app/privacy'
import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Container } from '@/components/Container'
import styles from './Privacy.module.css'

export function PrivacyPage() {
  useDocumentTitle('Privacy')
  return (
    <Container className={styles.page}>
      <h1 className={styles.title}>Privacy</h1>
      <p className={styles.meta}>
        Last updated {privacy.updatedOn}. Data controller: {privacy.controller} Contact{' '}
        {/* Linked, because this is the address the rest of the notice tells people to write to. */}
        <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
      {privacy.sections.map((section) => (
        <section key={section.title} className={styles.section} aria-labelledby={`privacy-${section.title}`}>
          <h2 id={`privacy-${section.title}`} className={styles.sectionTitle}>
            {section.title}
          </h2>
          {section.body.map((text) => (
            <p key={text} className={styles.text}>
              {text}
            </p>
          ))}
        </section>
      ))}
      <p className={styles.text}>
        Questions about any of this? <Link to="/contact">Contact the committee</Link>.
      </p>
    </Container>
  )
}
