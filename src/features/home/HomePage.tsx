import { useDocumentTitle } from '@/app/useDocumentTitle'
import styles from './Home.module.css'
import { Hero } from './sections/Hero'
import { JoinCta } from './sections/JoinCta'
import { NextEvent } from './sections/NextEvent'
import { PhotoCarousel } from './sections/PhotoCarousel'
import { UpcomingEvents } from './sections/UpcomingEvents'
import { VolunteerStrip } from './sections/VolunteerStrip'
import { WhoWeAre } from './sections/WhoWeAre'
import { YearStrip } from './sections/YearStrip'

export function HomePage() {
  useDocumentTitle()
  return (
    <div className={styles.page}>
      <Hero />
      <NextEvent />
      <WhoWeAre />
      <YearStrip />
      <UpcomingEvents />
      <VolunteerStrip />
      <PhotoCarousel />
      <JoinCta />
    </div>
  )
}
