import { useSettings } from '@/app/SettingsContext'
import type { HomeSection } from '@/domain/settings'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { canSee, useSession } from '@/lib/auth/session'
import styles from './Home.module.css'
import { Hero } from './sections/Hero'
import { JoinCta } from './sections/JoinCta'
import { NextEvent } from './sections/NextEvent'
import { NoticeStrip } from './sections/NoticeStrip'
import { PhotoStrip } from './sections/PhotoStrip'
import { UpcomingEvents } from './sections/UpcomingEvents'
import { VolunteerStrip } from './sections/VolunteerStrip'
import { WhoWeAre } from './sections/WhoWeAre'
import { YearStrip } from './sections/YearStrip'

export function HomePage() {
  useDocumentTitle()
  const { session } = useSession()
  const settings = useSettings()
  const show = (section: HomeSection) => canSee(settings.home[section], session.role)

  return (
    <div className={styles.page}>
      <Hero />
      {/* High, because a notice is the one thing here with a date on it: the hall shut on
          Saturday is no use below the photographs. */}
      {show('notices') ? <NoticeStrip /> : null}
      {show('nextEvent') ? <NextEvent /> : null}
      <WhoWeAre />
      {settings.showPhotos && show('photos') ? <PhotoStrip /> : null}
      {show('yearStrip') ? <YearStrip /> : null}
      {show('upcoming') ? <UpcomingEvents /> : null}
      {show('volunteer') ? <VolunteerStrip /> : null}
      <JoinCta />
    </div>
  )
}
