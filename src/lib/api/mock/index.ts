import { isUpcoming } from '@/domain/dates'
import { isValidAttendance, type EventAttendance } from '@/domain/attendance'
import { isValidContact, type ContactMessage } from '@/domain/contact'
import { isLive, isValid, slugFrom, validateAnnouncement, validateNews, type Announcement, type AnnouncementDraft, type NewsDraft, type NewsPost } from '@/domain/news'
import { isValidEvent, tidyProgramme, type Event, type EventDraft } from '@/domain/event'
import { uniqueSlug } from '@/domain/slug'
import { inOrder, pinnedCover, type AlbumDraft, type AlbumWithMedia, type Media } from '@/domain/gallery'
import { validateSettings, type SiteSettings } from '@/domain/settings'
import { defaultSettings } from '@/app/defaults'
import { isAdmin, isMember, isValidHousehold, type Household, type HouseholdDraft, type Person, type Viewer } from '@/domain/household'
import { ATTENDANCE_NOTE, CONTACT_NOTE, PHOTOGRAPH_NOTE, type HouseholdExport } from '@/domain/subjectAccess'
import type { ApiClient } from '../types'
import { buildFixtures } from './fixtures'
import { buildPortalFixtures } from './portal-fixtures'

export type MockApiOptions = {
  /** Clock used to decide what counts as upcoming. */
  now?: () => Date
  /** Simulated network delay in milliseconds. */
  latencyMs?: number
  /**
   * Events to serve instead of the ones the site ships. Tests use this so the suite does
   * not break every time the committee adds something to the calendar or takes it away.
   */
  events?: Event[]
}

function delay<T>(value: T, ms: number): Promise<T> {
  if (ms <= 0) return Promise.resolve(value)
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/**
 * What the database says when somebody writes something they are not allowed to write.
 * Postgres raises; this rejects. A read that is not allowed comes back empty instead, which
 * is also what row level security does — a policy hides rows, it does not announce them.
 */
export class NotAllowed extends Error {
  constructor(what: string) {
    super(`Not allowed: ${what}`)
    this.name = 'NotAllowed'
  }
}


/** The parts of a draft that belong to the household, with people given ids. */
function shapeOf(draft: HouseholdDraft) {
  const people: Person[] = draft.people.map((person, i) => ({
    id: `p-${i + 1}`,
    name: person.name.trim(),
    ageGroup: person.ageGroup,
    ...(person.ageGroup === 'child' && person.age !== undefined ? { age: person.age } : {}),
    ...(person.note?.trim() ? { note: person.note.trim() } : {}),
  }))
  return {
    name: draft.name.trim(),
    contactName: draft.contactName.trim(),
    ...(draft.email?.trim() ? { email: draft.email.trim() } : { email: undefined }),
    ...(draft.phone?.trim() ? { phone: draft.phone.trim() } : { phone: undefined }),
    people,
    interests: draft.interests,
  }
}


/** On the website: it went up at some point, and has not been taken down since. */
const published = (post: NewsPost): post is NewsPost & { publishedAt: string } =>
  Boolean(post.publishedAt) && !post.hidden
const byNewest = (a: NewsPost, b: NewsPost) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')

function shapeOfPost(draft: NewsDraft) {
  return {
    title: draft.title.trim(),
    excerpt: draft.excerpt.trim(),
    body: draft.body.trim(),
    tags: draft.tags.filter((tag) => tag.trim()).map((tag) => tag.trim()),
    author: draft.author.trim(),
  }
}

function shapeOfAnnouncement(draft: AnnouncementDraft, fallbackPublishAt: string) {
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    pinned: draft.pinned,
    audience: draft.audience,
    publishAt: draft.publishAt || fallbackPublishAt,
    ...(draft.expiresAt ? { expiresAt: draft.expiresAt } : {}),
    ...(draft.link?.label.trim() && draft.link.to.trim() ? { link: draft.link } : {}),
  }
}

/** The draft, with the empty strings turned back into absent fields. */
function shapeOfEvent(draft: EventDraft) {
  const text = (value: string) => (value.trim() ? value.trim() : undefined)
  const programme = tidyProgramme(draft.programme)
  return {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    startsAt: draft.startsAt,
    endsAt: text(draft.endsAt),
    venue: draft.venue.trim(),
    venueAddress: text(draft.venueAddress),
    coordinates: draft.coordinates ?? undefined,
    coverImageUrl: text(draft.coverImageUrl),
    coverAnimation: draft.coverAnimation,
    // An empty theme is absent rather than three empty strings, or the page draws a blank kicker.
    theme: draft.theme.bengali.trim()
      ? {
          bengali: draft.theme.bengali.trim(),
          bengaliSubtitle: text(draft.theme.bengaliSubtitle),
          english: text(draft.theme.english),
        }
      : undefined,
    programme: programme.length > 0 ? programme : undefined,
    registrationUrl: text(draft.registrationUrl),
    performerFormUrl: text(draft.performerFormUrl),
    registrationOpen: draft.registrationOpen,
    volunteerCall: text(draft.volunteerCall),
    performerCall: text(draft.performerCall),
    householdsRegistered: draft.householdsRegistered,
    status: draft.status,
    isPublic: draft.isPublic,
  }
}

/** An album needs a name people can read, and nothing else the form does not already give it. */
function checkAlbum(draft: AlbumDraft): NotAllowed | null {
  if (draft.title.trim().length < 2) return new NotAllowed('an album needs a name')
  return null
}

/**
 * Everything that would make a write wrong, before any of it is applied.
 *
 * The column rules are the interesting half. A draft is whatever the browser chose to send: a
 * form that does not draw a field is no guarantee that nobody sent one, so a member offering a
 * role is refused here rather than quietly ignored — which is the answer the database's
 * trigger gives, in the same words.
 */
function checkDraft(draft: HouseholdDraft, viewer: Viewer, existing?: Household): NotAllowed | null {
  if (!isValidHousehold(draft)) return new NotAllowed('that household is not complete')

  if (!isAdmin(viewer)) {
    const current = existing
    if (draft.role !== undefined && draft.role !== current?.role) {
      return new NotAllowed('only the committee can change a role')
    }
    if (draft.googleEmail !== undefined && draft.googleEmail !== (current?.googleEmail ?? null)) {
      return new NotAllowed('only the committee can change the sign-in address')
    }
    /*
     * Normalised on both sides before comparing. The form hands back an empty string for a date
     * nobody has set and the household holds null, so a straight `!==` reads "changed nothing"
     * as an attempted change — and every household the committee has just written down has a
     * null date, so a member saving their own details would be refused for touching nothing.
     * The database's trigger compares with `is distinct from`, which is this in one word.
     */
    const offered = draft.membershipPaidTo || null
    const held = current?.membership.paidTo ?? null
    if (
      (draft.membershipStatus !== undefined && draft.membershipStatus !== current?.membership.status) ||
      (draft.membershipPaidTo !== undefined && offered !== held)
    ) {
      return new NotAllowed('only the committee can change membership')
    }
  }
  return null
}

export function createMockApi({ now = () => new Date(), latencyMs = 0, events }: MockApiOptions = {}): ApiClient {
  const fixtures = buildFixtures()
  /**
   * Each client gets its own events, not the caller's.
   *
   * Copying the array alone was not enough: the objects in it were shared, so archiving an
   * event through one client changed the fixture every other client was handed. Harmless in the
   * app, which builds one client — and a puzzle in a test suite, where the second test inherits
   * what the first one did. Nested values (theme, programme) are replaced wholesale rather than
   * edited in place, so a copy one deep is all this needs.
   */
  const allEvents = (events ?? fixtures.events).map((event) => ({ ...event }))
  const portal = buildPortalFixtures()
  /** What the committee has chosen, starting from what the code says. */
  let saved: SiteSettings = { ...defaultSettings, home: { ...defaultSettings.home } }

  /**
   * Has a page somebody can open.
   *
   * A cancelled evening counts. It used to be filtered out everywhere, which meant its page
   * answered as though it had never existed — so anybody holding the link, or who saw it last
   * week, learned nothing. That is how people end up outside a hall on a Saturday. It is
   * reachable, and it says what happened.
   */
  const reachable = (event: Event) => event.isPublic && event.status !== 'draft'

  /** Actually going ahead. What "the next event" means, and what a countdown counts to. */
  const goingAhead = (event: Event) => reachable(event) && event.status === 'published'

  // Cancelled evenings stay in the list until their date has passed, marked as cancelled.
  // Quietly dropping one is indistinguishable from never having announced it.
  const upcomingEvents = () =>
    allEvents
      .filter((event) => reachable(event) && event.status !== 'past' && isUpcoming(event.startsAt, now()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const pastEvents = () =>
    allEvents
      .filter((event) => reachable(event) && !isUpcoming(event.startsAt, now()))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))

  const sentMessages: ContactMessage[] = []

  /**
   * A handful taken at random rather than the first few. Without it the home page shows the
   * same faces to everybody for as long as an album is the newest one, and the rest of the
   * evening is never seen. Drawn per fetch: React Query holds the answer, so the page is
   * steady while it is being read and different on the next visit.
   */
  const someOf = <T,>(items: T[], count: number): T[] => {
    const pool = [...items]
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, count)
  }

  const withMedia = (album: (typeof fixtures.albums)[number]): AlbumWithMedia => {
    const media = inOrder(fixtures.media.filter((m) => m.albumId === album.id && m.approved))
    /**
     * A pinned cover wins. Where none is pinned — which is most albums — a different
     * photograph fronts it on each fetch, so one face is not the whole of an evening every
     * time somebody visits. Picked per fetch rather than per render: React Query holds the
     * answer, so it stays put while a page is being read and differs on the next visit.
     */
    const cover =
      pinnedCover(album, media) ?? (media.length > 0 ? media[Math.floor(Math.random() * media.length)] : undefined)
    return { ...album, media, cover }
  }
  const publicAlbums = () =>
    fixtures.albums
      .filter((a) => a.visibility === 'public')
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(withMedia)

  return {
    delivers: false,
    events: {
      listUpcoming: (limit = 10) => delay(upcomingEvents().slice(0, limit), latencyMs),
      listPast: (limit = 10) => delay(pastEvents().slice(0, limit), latencyMs),
      // The next one that is actually happening: a countdown to a cancelled evening is cruel.
      getNext: () => delay(upcomingEvents().find(goingAhead) ?? null, latencyMs),
      getBySlug: (slug) => delay(allEvents.find((e) => e.slug === slug && reachable(e)) ?? null, latencyMs),

      listAll: (viewer) =>
        delay(isAdmin(viewer) ? [...allEvents].sort((a, b) => b.startsAt.localeCompare(a.startsAt)) : [], latencyMs),

      create: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        if (!isValidEvent(draft)) return Promise.reject(new NotAllowed('that event is not ready'))
        const event: Event = {
          id: `ev-${allEvents.length + 1}-${Date.now()}`,
          slug: uniqueSlug(draft.title, allEvents.map((e) => e.slug), 'event'),
          ...shapeOfEvent(draft),
          // Whatever the form said. A new evening is nobody's business until it is finished.
          status: 'draft',
        }
        allEvents.push(event)
        return delay(event, latencyMs)
      },

      archive: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const event = allEvents.find((e) => e.id === id)
        if (!event) return Promise.reject(new NotAllowed('no such event'))
        event.status = 'past'
        return delay(event, latencyMs)
      },

      save: (id, draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const event = allEvents.find((e) => e.id === id)
        if (!event) return Promise.reject(new NotAllowed('no such event'))
        if (!isValidEvent(draft)) return Promise.reject(new NotAllowed('that event is not ready'))
        Object.assign(event, shapeOfEvent(draft))
        return delay(event, latencyMs)
      },
    },
    festivals: {
      list: () => delay([...fixtures.festivals], latencyMs),
    },
    gallery: {
      listRecentMedia: (limit = 6) => delay(someOf(publicAlbums().flatMap((a) => a.media), limit), latencyMs),
      listAlbums: () => delay(publicAlbums(), latencyMs),
      getAlbum: (slug) => delay(publicAlbums().find((a) => a.slug === slug) ?? null, latencyMs),

      listAllAlbums: (viewer) =>
        delay(
          isAdmin(viewer)
            ? [...fixtures.albums].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).map(withMedia)
            : [],
          latencyMs,
        ),

      createAlbum: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can make an album'))
        const refusal = checkAlbum(draft)
        if (refusal) return Promise.reject(refusal)
        const slug = draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        if (fixtures.albums.some((a) => a.slug === slug)) {
          return Promise.reject(new NotAllowed('there is already an album with that name'))
        }
        const album = {
          id: `al-${fixtures.albums.length + 1}`,
          slug,
          publishedAt: now().toISOString(),
          ...draft,
          title: draft.title.trim(),
        }
        fixtures.albums.push(album)
        return delay(album, latencyMs)
      },

      updateAlbum: (id, draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can change an album'))
        const album = fixtures.albums.find((a) => a.id === id)
        if (!album) return Promise.reject(new NotAllowed('no such album'))
        const refusal = checkAlbum(draft)
        if (refusal) return Promise.reject(refusal)
        Object.assign(album, { ...draft, title: draft.title.trim() })
        return delay(album, latencyMs)
      },

      setCover: (albumId, mediaId, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const album = fixtures.albums.find((a) => a.id === albumId)
        if (!album) return Promise.reject(new NotAllowed('no such album'))
        // A photograph from another album would front one evening with another's picture.
        if (!fixtures.media.some((x) => x.id === mediaId && x.albumId === albumId)) {
          return Promise.reject(new NotAllowed('that photograph is not in this album'))
        }
        album.coverMediaId = mediaId
        return delay(album, latencyMs)
      },

      setCaption: (mediaId, caption, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const media = fixtures.media.find((x) => x.id === mediaId)
        if (!media) return Promise.reject(new NotAllowed('no such photograph'))
        media.caption = caption.trim() || undefined
        return delay(media, latencyMs)
      },

      reorder: (albumId, mediaIds, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const inAlbum = fixtures.media.filter((x) => x.albumId === albumId)
        // Every photograph, once each: a partial list would silently drop the rest to the end.
        const same =
          inAlbum.length === mediaIds.length && inAlbum.every((x) => mediaIds.includes(x.id)) && new Set(mediaIds).size === mediaIds.length
        if (!same) return Promise.reject(new NotAllowed('that is not this album, in one piece'))
        mediaIds.forEach((id, i) => {
          const media = fixtures.media.find((x) => x.id === id)
          if (media) media.position = i
        })
        return delay(inOrder(inAlbum), latencyMs)
      },

      addMedia: (albumId, photo, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const album = fixtures.albums.find((a) => a.id === albumId)
        if (!album) return Promise.reject(new NotAllowed('no such album'))
        const inAlbum = fixtures.media.filter((x) => x.albumId === albumId)
        const media: Media = {
          id: `m-${photo.url.split('/').pop()?.replace(/\.jpg$/, '') ?? fixtures.media.length + 1}`,
          albumId,
          type: 'photo',
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl,
          approved: true,
          // At the end: the order the committee put them in is the order they arrived.
          position: inAlbum.length,
        }
        fixtures.media.push(media)
        return delay(media, latencyMs)
      },

      deleteMedia: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const index = fixtures.media.findIndex((x) => x.id === id)
        if (index === -1) return Promise.reject(new NotAllowed('no such photograph'))
        const [gone] = fixtures.media.splice(index, 1)
        // An album must not go on pointing at a photograph that is not there.
        for (const album of fixtures.albums) if (album.coverMediaId === gone.id) album.coverMediaId = undefined
        return delay(undefined, latencyMs)
      },
    },
    news: {
      listPosts: (limit = 20) =>
        // Published only. Nothing filtered these before, because nothing could be a draft.
        delay(fixtures.posts.filter(published).sort(byNewest).slice(0, limit), latencyMs),
      getPost: (slug) => delay(fixtures.posts.filter(published).find((p) => p.slug === slug) ?? null, latencyMs),
      listAnnouncements: (viewer) => {
        const at = now().toISOString()
        // A members-only notice is for anybody signed in and matched to a household. The mock
        // refuses exactly what the policies refuse, which is the whole point of it.
        const allowed = isMember(viewer) ? ['public', 'members'] : ['public']
        const live = fixtures.announcements.filter((a) => allowed.includes(a.audience) && isLive(a, at))
        live.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt))
        return delay(live, latencyMs)
      },
      listNewsletters: () => delay([...fixtures.newsletters].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)), latencyMs),

      listAllPosts: (viewer) =>
        delay(isAdmin(viewer) ? [...fixtures.posts].sort(byNewest) : [], latencyMs),

      listAllAnnouncements: (viewer) =>
        delay(
          isAdmin(viewer)
            ? [...fixtures.announcements].sort(
                (a, b) => Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt),
              )
            : [],
          latencyMs,
        ),

      createPost: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can write here'))
        if (!isValid(validateNews(draft))) return Promise.reject(new NotAllowed('that piece is not finished'))
        const slug = slugFrom(draft.title)
        if (fixtures.posts.some((p) => p.slug === slug)) {
          return Promise.reject(new NotAllowed('there is already a piece with that title'))
        }
        const post: NewsPost = {
          id: `np-${fixtures.posts.length + 1}`,
          slug,
          ...shapeOfPost(draft),
          publishedAt: draft.published ? now().toISOString() : undefined,
        }
        fixtures.posts.push(post)
        return delay(post, latencyMs)
      },

      updatePost: (id, draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can write here'))
        const post = fixtures.posts.find((p) => p.id === id)
        if (!post) return Promise.reject(new NotAllowed('no such piece'))
        if (!isValid(validateNews(draft))) return Promise.reject(new NotAllowed('that piece is not finished'))
        Object.assign(post, shapeOfPost(draft))
        // Publishing stamps the date the first time only; taking it down hides it and keeps
        // both the writing and the date, so a round-up of April goes back up dated April.
        if (draft.published) {
          post.publishedAt = post.publishedAt ?? now().toISOString()
          post.hidden = false
        } else {
          post.hidden = true
        }
        return delay(post, latencyMs)
      },

      createAnnouncement: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can post a notice'))
        if (!isValid(validateAnnouncement(draft))) return Promise.reject(new NotAllowed('that notice is not ready'))
        const announcement: Announcement = {
          id: `an-${fixtures.announcements.length + 1}`,
          ...shapeOfAnnouncement(draft, now().toISOString()),
        }
        fixtures.announcements.push(announcement)
        return delay(announcement, latencyMs)
      },

      updateAnnouncement: (id, draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can post a notice'))
        const announcement = fixtures.announcements.find((a) => a.id === id)
        if (!announcement) return Promise.reject(new NotAllowed('no such notice'))
        if (!isValid(validateAnnouncement(draft))) return Promise.reject(new NotAllowed('that notice is not ready'))
        const next = shapeOfAnnouncement(draft, announcement.publishAt)
        Object.assign(announcement, next)
        if (!next.expiresAt) delete announcement.expiresAt
        if (!next.link) delete announcement.link
        return delay(announcement, latencyMs)
      },

      removeAnnouncement: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const index = fixtures.announcements.findIndex((a) => a.id === id)
        if (index === -1) return Promise.reject(new NotAllowed('no such notice'))
        fixtures.announcements.splice(index, 1)
        return delay(undefined, latencyMs)
      },
    },
    contact: {
      send: (input) => {
        if (!isValidContact(input)) return Promise.reject(new Error('Please check the form and try again.'))
        const message: ContactMessage = { ...input, id: `cm-${sentMessages.length + 1}`, createdAt: now().toISOString() }
        sentMessages.push(message)
        // The row is kept, so the committee's inbox can show it — but only the receipt goes
        // back to the sender, because that is all the real adapter is able to return. The mock
        // giving out more than the database can is how the contract came to promise a stored
        // row that the public website has no way to read.
        return delay({ name: message.name, email: message.email }, latencyMs)
      },
      listMessages: (viewer) =>
        delay(
          isAdmin(viewer)
            ? [...portal.messages, ...sentMessages].sort(
                (a, b) =>
                  // Takedowns that nobody has dealt with, first. An inbox where one arrives
                  // between a parking question and a request to sing is an inbox where it waits.
                  Number(b.kind === 'photo' && !b.handledBy) - Number(a.kind === 'photo' && !a.handledBy) ||
                  b.createdAt.localeCompare(a.createdAt),
              )
            : [],
          latencyMs,
        ),
      markHandled: (id, viewer, note) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can handle a message'))
        const message = [...portal.messages, ...sentMessages].find((m) => m.id === id)
        if (!message) return Promise.reject(new NotAllowed('no such message'))
        // A takedown has to say what happened to the photograph. "Handled" on its own does not
        // tell anybody whether the picture actually came out of the bucket.
        if (message.kind === 'photo' && !note?.trim()) {
          return Promise.reject(new NotAllowed('say what happened to the photograph'))
        }
        // The name, not the id: the screen prints this column straight out, and an id there
        // shows a reader "handled by h-3". The database adapter looks the same name up.
        message.handledBy = portal.households.find((h) => h.id === viewer.householdId)?.name ?? 'The committee'
        if (note?.trim()) message.handledNote = note.trim()
        return delay(message, latencyMs)
      },
      deleteMessage: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        // Both lists, because a message sent while the app has been open is in `sentMessages`
        // and one that was always there is in the fixtures. Missing from both is the same
        // answer as never having existed.
        for (const list of [portal.messages, sentMessages]) {
          const at = list.findIndex((m) => m.id === id)
          if (at !== -1) {
            list.splice(at, 1)
            return delay(undefined, latencyMs)
          }
        }
        return Promise.reject(new NotAllowed('no such message'))
      },
    },
    // Every rule below has a policy in supabase/portal.sql that says the same thing, and a
    // block in supabase/verify.sql that proves the database agrees. Three enforcers, one set
    // of rules: if these three ever disagree, the database is the one telling the truth.
    portal: {
      identify: (email) => {
        const match = portal.households.find((h) => h.googleEmail?.toLowerCase() === email.toLowerCase())
        return delay(match ? { id: match.id, name: match.name, role: match.role } : null, latencyMs)
      },
      // Not found and not allowed are the same answer on purpose. Telling somebody a
      // household exists but is not theirs is itself a fact about a household.
      getHousehold: (id, viewer) => {
        const household = portal.households.find((h) => h.id === id) ?? null
        if (!household) return delay(null, latencyMs)
        const mine = viewer?.householdId === household.id
        return delay(mine || isAdmin(viewer) ? household : null, latencyMs)
      },
      listHouseholds: (viewer) =>
        delay(
          isAdmin(viewer) ? [...portal.households].sort((a, b) => a.name.localeCompare(b.name)) : [],
          latencyMs,
        ),
      listSignInAttempts: (viewer) =>
        delay(
          isAdmin(viewer)
            ? [...portal.signInAttempts].sort((a, b) => b.lastTriedAt.localeCompare(a.lastTriedAt))
            : [],
          latencyMs,
        ),

      listAttendance: (viewer) =>
        delay(
          isMember(viewer) ? [...portal.attendance].sort((a, b) => b.heldOn.localeCompare(a.heldOn)) : [],
          latencyMs,
        ),

      recordAttendance: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can record that'))
        if (!isValidAttendance(draft)) return Promise.reject(new NotAllowed('those numbers do not look right'))
        const existing = portal.attendance.find((a) => a.eventId === draft.eventId)
        const record: EventAttendance = { ...draft, recordedAt: now().toISOString() }
        // One per event. Saving again corrects the number rather than adding a second one.
        if (existing) Object.assign(existing, record)
        else portal.attendance.push(record)
        return delay(existing ?? record, latencyMs)
      },

      addHousehold: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can add a household'))
        const refusal = checkDraft(draft, viewer)
        if (refusal) return Promise.reject(refusal)
        if (draft.googleEmail && portal.households.some((h) => h.googleEmail === draft.googleEmail)) {
          return Promise.reject(new NotAllowed('that Google address already belongs to a household'))
        }
        const household: Household = {
          id: `hh-${portal.households.length + 1}-${draft.name.toLowerCase().replace(/[^a-z]+/g, '') || 'new'}`,
          ...shapeOf(draft),
          googleEmail: draft.googleEmail ?? null,
          memberSince: now().toISOString().slice(0, 10),
          membership: { status: draft.membershipStatus ?? 'active', paidTo: draft.membershipPaidTo || null },
          role: draft.role ?? 'member',
        }
        portal.households.push(household)
        return delay(household, latencyMs)
      },

      exportHousehold: async (id, viewer) => {
        const household = portal.households.find((h) => h.id === id)
        if (!household || (viewer?.householdId !== id && !isAdmin(viewer))) {
          return Promise.reject(new NotAllowed('no such household'))
        }

        // Every address we know for them, because contact_messages is keyed by whatever was
        // typed into the form and not by a household.
        const addresses = new Set(
          [household.email, household.googleEmail].filter(Boolean).map((a) => a!.toLowerCase()),
        )

        const result: HouseholdExport = {
          takenAt: now().toISOString(),
          household,
          messages: [...portal.messages, ...sentMessages]
            .filter((m) => addresses.has(m.email.toLowerCase()))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          signInAttempts: portal.signInAttempts
            .filter((a) => addresses.has(a.email.toLowerCase()))
            .map(({ email, lastTriedAt, attempts }) => ({ email, lastTriedAt, attempts })),
          // Filled in by withAuditTrail, which is the only thing that holds the trail. The
          // same wrapper writes it, so the same wrapper is what can read it back out.
          changes: [],
          notes: [ATTENDANCE_NOTE, PHOTOGRAPH_NOTE, CONTACT_NOTE],
        }
        return delay(result, latencyMs)
      },

      resolveSignInAttempt: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can do that'))
        const attempt = portal.signInAttempts.find((a) => a.id === id)
        if (!attempt) return Promise.reject(new NotAllowed('no such sign-in attempt'))
        attempt.resolved = true
        return delay(attempt, latencyMs)
      },

      deleteHousehold: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can remove a household'))
        const index = portal.households.findIndex((h) => h.id === id)
        if (index === -1) return Promise.reject(new NotAllowed('no such household'))

        // Not your own: an admin removing themselves is almost always a misclick, and there is
        // nobody left on that side of the screen to undo it.
        if (viewer.householdId === id) {
          return Promise.reject(new NotAllowed('you cannot remove your own household'))
        }
        if (
          portal.households[index].role === 'admin' &&
          portal.households.filter((h) => h.role === 'admin').length <= 1
        ) {
          return Promise.reject(new NotAllowed('that is the last admin — make somebody else one first'))
        }

        portal.households.splice(index, 1)
        return delay(undefined, latencyMs)
      },

      updateHousehold: (id, draft, viewer) => {
        const existing = portal.households.find((h) => h.id === id)
        // Not found and not allowed give the same answer, as everywhere else here.
        if (!existing || (viewer?.householdId !== id && !isAdmin(viewer))) {
          return Promise.reject(new NotAllowed('no such household'))
        }
        const refusal = checkDraft(draft, viewer, existing)
        if (refusal) return Promise.reject(refusal)

        // The committee must not be able to lock itself out. Mirrors the trigger
        // portal.guard_last_admin, which refuses the same change in the same words.
        const losingAdmin = existing.role === 'admin' && (draft.role ?? existing.role) !== 'admin'
        if (losingAdmin && portal.households.filter((h) => h.role === 'admin').length <= 1) {
          return Promise.reject(new NotAllowed('that is the last admin — make somebody else one first'))
        }

        Object.assign(existing, shapeOf(draft))
        if (isAdmin(viewer)) {
          existing.googleEmail = draft.googleEmail ?? null
          existing.role = draft.role ?? existing.role
          existing.membership = {
            status: draft.membershipStatus ?? existing.membership.status,
            // Absent leaves it alone; empty clears it. `fromDraft` sends the same two answers
            // to Postgres, and the two have to agree or the mock is teaching the wrong thing.
            paidTo: draft.membershipPaidTo === undefined ? existing.membership.paidTo : draft.membershipPaidTo || null,
          }
        }
        return delay(existing, latencyMs)
      },
    },
    settings: {
      get: () => delay({ ...saved, home: { ...saved.home } }, latencyMs),
      save: (draft, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can change that'))
        if (!validateSettings(draft)) return Promise.reject(new NotAllowed('those settings do not look right'))
        saved = { ...draft, home: { ...draft.home } }
        return delay({ ...saved, home: { ...saved.home } }, latencyMs)
      },
    },
    // Empty here on purpose: recording is withAuditTrail's job, wrapped around the outside.
    audit: { list: () => delay([], latencyMs) },
    volunteering: {
      listOpenRoles: () => delay(fixtures.volunteerRoles.filter((r) => r.filled < r.slots), latencyMs),
      listRolesForEvent: (eventId) => delay(fixtures.volunteerRoles.filter((r) => r.eventId === eventId), latencyMs),
    },
  }
}
