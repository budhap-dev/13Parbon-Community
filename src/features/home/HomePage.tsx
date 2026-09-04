import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { canSee, useSession } from '@/lib/auth/session'
import styles from './Home.module.css'
import { Hero } from './sections/Hero'
import { NextEventStrip } from './sections/NextEventStrip'
import { JoinCta } from './sections/JoinCta'
import { NextEvent } from './sections/NextEvent'
import { PhotoCarousel } from './sections/PhotoCarousel'
import { PhotoMosaic } from './sections/PhotoMosaic'
import { UpcomingEvents } from './sections/UpcomingEvents'
import { VolunteerStrip } from './sections/VolunteerStrip'
import { WhoWeAre } from './sections/WhoWeAre'
import { YearStrip } from './sections/YearStrip'

export function HomePage() {
  useDocumentTitle()
  const { session } = useSession()
  const show = (section: keyof typeof site.home) => canSee(site.home[section], session.role)

  return (
    <div className={styles.page}>
      <NextEventStrip />
      <Hero />
      {show('nextEvent') ? <NextEvent /> : null}
      <WhoWeAre />
      {site.showPhotos && show('photos') ? <PhotoMosaic /> : null}
      {show('yearStrip') ? <YearStrip /> : null}
      {show('upcoming') ? <UpcomingEvents /> : null}
      {show('volunteer') ? <VolunteerStrip /> : null}
      {site.showPhotos && show('photos') ? <PhotoCarousel /> : null}
      <JoinCta />
    </div>
  )
}
