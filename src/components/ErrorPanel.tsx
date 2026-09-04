import { Button } from './Button'
import { Container } from './Container'
import { site } from '@/app/site'
import styles from './ErrorPanel.module.css'

/**
 * What a viewer sees when a page could not be rendered at all. It says whose fault it is not,
 * gives them something to press, and keeps a way back to the rest of the site.
 */
export function ErrorPanel() {
  return (
    <Container className={styles.page}>
      <section className={styles.box} aria-labelledby="error-title">
        <h1 id="error-title" className={styles.title}>
          Something went wrong at our end
        </h1>
        <p className={styles.text}>
          Not your doing — this page failed to load properly. Reloading usually sorts it.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => window.location.reload()} variant="cream">
            Reload the page
          </Button>
          <Button href="/" variant="line">
            Back to the home page
          </Button>
        </div>
        <p className={styles.aside}>
          If it keeps happening, tell us on{' '}
          {site.social.map((channel, i) => (
            <span key={channel.name}>
              {i > 0 ? ' or ' : ''}
              {channel.href ? (
                <a href={channel.href} target="_blank" rel="noreferrer">
                  {channel.mention}
                </a>
              ) : (
                channel.mention
              )}
            </span>
          ))}
          .
        </p>
      </section>
    </Container>
  )
}
