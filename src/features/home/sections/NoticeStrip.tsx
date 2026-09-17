import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { useAnnouncements } from '@/lib/api'
import styles from '../Home.module.css'

/** Three at most. A noticeboard with ten things on it is a wall, and nobody reads a wall. */
const MOST = 3

/**
 * What is true this week, where somebody will actually see it.
 *
 * Notices had two homes and neither was reachable: the News page, which is out of the
 * navigation until there is news to carry, and the member dashboard, which is behind a sign-in
 * that is switched off. So the committee could put up "the hall is shut on Saturday" and no
 * visitor could find it — which is most of what a noticeboard is for.
 *
 * Pinned first, then newest, and only ones that are live: a notice takes itself down on its own
 * expiry, decided by the database rather than by the browser's clock. Nothing is drawn when
 * there is nothing to say, so the page closes up rather than showing an empty box.
 */
export function NoticeStrip() {
  const { data: notices } = useAnnouncements()
  const live = (notices ?? []).slice(0, MOST)
  if (live.length === 0) return null

  return (
    <Container>
      <section className={styles.notices} aria-labelledby="notices-heading">
        <h2 id="notices-heading" className={styles.noticesTitle}>
          <Icon name="megaphone" className={styles.noticesIcon} />
          Announcements
        </h2>
        <ul className={styles.noticesList}>
          {live.map((notice) => (
            <li key={notice.id} className={styles.notice}>
              <p className={styles.noticeTitle}>{notice.title}</p>
              <p className={styles.noticeBody}>{notice.body}</p>
              {notice.link ? (
                <Button to={notice.link.to} variant="line" size="sm">
                  {notice.link.label}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </Container>
  )
}
