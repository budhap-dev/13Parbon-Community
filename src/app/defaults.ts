import { HOME_BLOCKS, type SiteSettings } from '@/domain/settings'
import { about } from './about'
import { festivals } from './festivals'
import { privacy } from './privacy'
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
  showFeedback: site.showFeedback,
  showQuizzes: site.showQuizzes,
  showSponsors: site.showSponsors,
  home: { ...site.home },
  homeOrder: [...HOME_BLOCKS],
  defaultTheme: 'festival',
  text: {
    heroLead: site.bengaliTitleLead,
    heroName: site.groupName,
    volunteerTitle: 'A Festival is Best Shared',
    joinTitle: 'Come for one evening.',
    joinText:
      'Everyone is welcome at our programmes, member or not. Come along, say hello, and if you would like to stay, talk to the committee.',
    town: site.town,
    tagline: site.tagline,
    mission: site.mission,
    missionStatement: site.missionStatement,
    venue: site.venue,
    address: site.address,
    email: site.email,
    galleryNote: site.galleryNote ?? '',
  },
  committee: about.committee.map((row) => ({ ...row })),
  faq: about.faq.map((item) => ({ question: item.q, answer: item.a })),
  members: [...about.members],
  social: site.social.map((channel) => ({
    name: channel.name,
    icon: channel.icon,
    href: channel.href ?? '',
    blurb: channel.blurb,
    mention: channel.mention,
  })),
  volunteerFormUrl: site.volunteerFormUrl ?? '',
  festivals: festivals.map((festival) => ({ ...festival })),
  story: about.story.map((block) => (block.kind === 'list' ? { kind: 'list', items: [...block.items] } : { ...block })),
  values: about.values.map((value) => ({ ...value })),
  collage: {
    label: 'Calcutta then, Kolkata now',
    credit: site.themeImageCredit,
    photos: site.themeImages.map((image) => ({ ...image })),
  },
  privacy: {
    updatedOn: privacy.updatedOn,
    controller: privacy.controller,
    // The same date twice on purpose: this *is* the developer's version, so it is based on itself.
    basedOn: privacy.updatedOn,
    sections: privacy.sections.map((section) => ({ title: section.title, body: [...section.body] })),
  },
  tools: site.tools.map((tool) => ({ ...tool })),
  // None until the committee adds them. There is nothing a developer should be typing in here.
  sponsors: [],
}
