import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useViewer, canSee } from '@/lib/viewer'
import styles from './Home.module.css'
import { Hero } from './sections/Hero'
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
  const { role } = useViewer()
  const show = (section: keyof typeof site.home) => canSee(site.home[section], role)

  return (
    <div className={styles.page}>
      <Hero />
      {show('nextEvent') ? <NextEvent /> : null}
      <WhoWeAre />
      {show('photos') ? <PhotoMosaic /> : null}
      {show('yearStrip') ? <YearStrip /> : null}
      {show('upcoming') ? <UpcomingEvents /> : null}
      {show('volunteer') ? <VolunteerStrip /> : null}
      {show('photos') ? <PhotoCarousel /> : null}
      <JoinCta />
    </div>
  )
}
