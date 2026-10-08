import { Fragment, type ReactNode } from 'react'
import { useSettings } from '@/app/SettingsContext'
import type { HomeBlock, HomeSection } from '@/domain/settings'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { canSee, useSession } from '@/lib/auth/session'
import styles from './Home.module.css'
import { FeedbackStrip } from './sections/FeedbackStrip'
import { Hero } from './sections/Hero'
import { JoinCta } from './sections/JoinCta'
import { NextEvent } from './sections/NextEvent'
import { NoticeStrip } from './sections/NoticeStrip'
import { PhotoStrip } from './sections/PhotoStrip'
import { SponsorsStrip } from './sections/SponsorsStrip'
import { UpcomingEvents } from './sections/UpcomingEvents'
import { VolunteerStrip } from './sections/VolunteerStrip'
import { WhoWeAre } from './sections/WhoWeAre'
import { YearStrip } from './sections/YearStrip'

export function HomePage() {
  useDocumentTitle()
  const { session } = useSession()
  const settings = useSettings()
  const show = (section: HomeSection) => canSee(settings.home[section], session.role)

  /*
   * Each part, and whether this viewer gets it. The order they are drawn in is the
   * committee's — `settings.homeOrder` — and what the code says is only where that starts:
   * notices high, because a notice is the one thing here with a date on it, and what people
   * said low, because it persuades somebody who has read everything above and is still
   * deciding. Whether a part is drawn at all is still decided here, by its audience and its
   * switch, so moving the photographs to the top cannot bring back a gallery that is off.
   */
  const blocks: Record<HomeBlock, () => ReactNode> = {
    notices: () => (show('notices') ? <NoticeStrip /> : null),
    nextEvent: () => (show('nextEvent') ? <NextEvent /> : null),
    whoWeAre: () => <WhoWeAre />,
    photos: () => (settings.showPhotos && show('photos') ? <PhotoStrip /> : null),
    yearStrip: () => (show('yearStrip') ? <YearStrip /> : null),
    upcoming: () => (show('upcoming') ? <UpcomingEvents /> : null),
    volunteer: () => (show('volunteer') ? <VolunteerStrip /> : null),
    feedback: () => (settings.showFeedback && show('feedback') ? <FeedbackStrip /> : null),
    sponsors: () => (settings.showSponsors && show('sponsors') ? <SponsorsStrip /> : null),
  }

  return (
    <div className={styles.page}>
      <Hero />
      {settings.homeOrder.map((block) => (
        <Fragment key={block}>{blocks[block]()}</Fragment>
      ))}
      <JoinCta />
    </div>
  )
}
