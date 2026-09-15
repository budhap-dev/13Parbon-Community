import type { SiteSettings } from '@/domain/settings'
import { about } from './about'
import { site } from './site'

/**
 * What the switches, words and lists are when nothing has been saved.
 *
 * Its own module rather than living in site.ts: it needs about.ts too, and about.ts already
 * reads site.venue. A cycle between those two leaves one of them undefined while the modules
 * are still evaluating, which fails as a page that cannot read 'venue' of undefined.
 *
 * The committee changes these in the admin, and their choice is stored; this is what the site
 * does before anybody has made one, and what it falls back to if the settings cannot be read.
 * A site that loses its database should not suddenly publish the things the committee had
 * switched off, so every default here is the cautious answer.
 */
export const defaultSettings: SiteSettings = {
  showMemberSignIn: site.showMemberSignIn,
  showNews: site.showNews,
  showNextEventStrip: site.showNextEventStrip,
  showPhotos: site.showPhotos,
  home: { ...site.home },
  text: {
    tagline: site.tagline,
    mission: site.mission,
    missionStatement: site.missionStatement,
    venue: site.venue,
    address: site.address,
    email: site.email,
    galleryNote: site.galleryNote ?? '',
  },
  committee: about.committee.map((row) => ({ ...row })),
  members: [...about.members],
}
