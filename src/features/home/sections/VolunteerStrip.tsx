import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { useNextEvent } from '@/lib/api'
import styles from '../Home.module.css'

/** A plain call for helpers at the next event. No slots: people say so when they register. */
export function VolunteerStrip() {
  const { data: event } = useNextEvent()
  if (!event?.volunteerCall) return null

  return (
    <Container>
      <aside className={styles.volunteer} aria-labelledby="volunteer-title">
        <Icon name="megaphone" className={styles.volunteerIcon} />
        <div className={styles.volunteerBody}>
          <h2 id="volunteer-title" className={styles.volunteerTitle}>
            A Festival is Best Shared
          </h2>
          <p className={styles.volunteerText}>{event.volunteerCall}</p>
        </div>
        <Button to={`/events/${event.slug}`} variant="line" size="sm">
          Register and say so
        </Button>
      </aside>
    </Container>
  )
}
