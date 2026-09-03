import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { useOpenVolunteerRoles } from '@/lib/api'
import styles from '../Home.module.css'

export function VolunteerStrip() {
  const { data } = useOpenVolunteerRoles()
  const role = data?.[0]
  if (!role) return null

  return (
    <Container>
      <aside className={styles.volunteer} aria-label="Volunteers needed">
        <Icon name="megaphone" className={styles.volunteerIcon} />
        <p className={styles.volunteerText}>
          <strong className={styles.volunteerStrong}>Volunteers needed.</strong> {role.title}
          {role.when ? `, ${role.when}` : ''}. {role.filled} of {role.slots} slots filled.
        </p>
        <Button to="/login" variant="line" size="sm">
          Take a slot
        </Button>
      </aside>
    </Container>
  )
}
