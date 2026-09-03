import { isUpcoming } from '@/domain/dates'
import { isValidContact, type ContactMessage } from '@/domain/contact'
import type { Event } from '@/domain/event'
import { isValidEventRegistration, type EventRegistration } from '@/domain/event-registration'
import type { AlbumWithMedia } from '@/domain/gallery'
import type { Household } from '@/domain/household'
import type { Registration } from '@/domain/registration'
import { defaultSiteText } from '@/app/site'
import type { SiteText } from '@/domain/site-text'
import type { ApiClient } from '../types'
import { buildFixtures } from './fixtures'
import { buildPortalFixtures } from './portal-fixtures'

export type MockApiOptions = {
  /** Clock used to decide what counts as upcoming. */
  now?: () => Date
  /** Simulated network delay in milliseconds. */
  latencyMs?: number
  /**
   * Whether to claim that submissions reach somebody. False by default, because they do
   * not: the mock keeps them in memory. Turn it on to exercise a form without a backend.
   */
  delivers?: boolean
}

function delay<T>(value: T, ms: number): Promise<T> {
  if (ms <= 0) return Promise.resolve(value)
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function createMockApi({ now = () => new Date(), latencyMs = 0, delivers = false }: MockApiOptions = {}): ApiClient {
  const fixtures = buildFixtures()
  const portal = buildPortalFixtures()

  const visible = (event: Event) => event.isPublic && event.status !== 'draft' && event.status !== 'cancelled'

  const upcomingEvents = () =>
    fixtures.events
      .filter((event) => visible(event) && event.status === 'published' && isUpcoming(event.startsAt, now()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const pastEvents = () =>
    fixtures.events
      .filter((event) => visible(event) && !isUpcoming(event.startsAt, now()))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))

  const sentMessages: ContactMessage[] = []
  const guestRegistrations: EventRegistration[] = []
  let siteText: SiteText = { ...defaultSiteText }
  let nextId = 1
  const id = (prefix: string) => `${prefix}-${nextId++}`

  const household = (householdId: string) => portal.households.find((h) => h.id === householdId)

  /** Keeps the public headcount honest when somebody registers or withdraws. */
  const recountEvent = (eventId: string) => {
    const event = fixtures.events.find((e) => e.id === eventId)
    if (event) event.householdsRegistered = portal.registrations.filter((r) => r.eventId === eventId).length
  }

  const withMedia = (album: (typeof fixtures.albums)[number]): AlbumWithMedia => {
    const media = fixtures.media.filter((m) => m.albumId === album.id && m.approved)
    return { ...album, media, cover: media[0] }
  }
  const publicAlbums = () =>
    fixtures.albums
      .filter((a) => a.visibility === 'public')
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(withMedia)

  return {
    delivers,
    events: {
      listUpcoming: (limit = 10) => delay(upcomingEvents().slice(0, limit), latencyMs),
      listPast: (limit = 10) => delay(pastEvents().slice(0, limit), latencyMs),
      getNext: () => delay(upcomingEvents()[0] ?? null, latencyMs),
      getBySlug: (slug) => delay(fixtures.events.find((e) => e.slug === slug && visible(e)) ?? null, latencyMs),
      register: (slug, input) => {
        const event = fixtures.events.find((e) => e.slug === slug && visible(e))
        if (!event) return Promise.reject(new Error('That event is not open for registration.'))
        if (!event.registrationOpen) return Promise.reject(new Error('Registration for this one has closed.'))
        if (!isValidEventRegistration(input)) return Promise.reject(new Error('Please check the form and try again.'))
        const saved: EventRegistration = {
          ...input,
          id: id('ereg'),
          eventSlug: slug,
          registeredAt: now().toISOString(),
        }
        guestRegistrations.push(saved)
        // The headcount on the public page is the point of all this, so keep it true.
        event.householdsRegistered += 1
        return delay(saved, latencyMs)
      },
    },
    festivals: {
      list: () => delay([...fixtures.festivals], latencyMs),
    },
    gallery: {
      listRecentMedia: (limit = 6) => delay(publicAlbums().flatMap((a) => a.media).slice(0, limit), latencyMs),
      listAlbums: () => delay(publicAlbums(), latencyMs),
      getAlbum: (slug) => delay(publicAlbums().find((a) => a.slug === slug) ?? null, latencyMs),
    },
    news: {
      listPosts: (limit = 20) =>
        delay([...fixtures.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit), latencyMs),
      getPost: (slug) => delay(fixtures.posts.find((p) => p.slug === slug) ?? null, latencyMs),
      listAnnouncements: () => {
        const at = now().toISOString()
        const live = fixtures.announcements.filter(
          (a) => a.audience === 'public' && a.publishAt <= at && (!a.expiresAt || a.expiresAt > at),
        )
        live.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt))
        return delay(live, latencyMs)
      },
      listNewsletters: () => delay([...fixtures.newsletters].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)), latencyMs),
    },
    contact: {
      send: (input) => {
        if (!isValidContact(input)) return Promise.reject(new Error('Please check the form and try again.'))
        const message: ContactMessage = { ...input, id: `cm-${sentMessages.length + 1}`, createdAt: now().toISOString() }
        sentMessages.push(message)
        return delay(message, latencyMs)
      },
      listMessages: () =>
        delay(
          [...portal.messages, ...sentMessages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          latencyMs,
        ),
    },
    portal: {
      getHousehold: (id) => delay(portal.households.find((h) => h.id === id) ?? null, latencyMs),
      listHouseholds: () => delay([...portal.households].sort((a, b) => a.name.localeCompare(b.name)), latencyMs),
      listDirectory: () =>
        delay(
          portal.households.filter((h) => h.listedInDirectory).sort((a, b) => a.name.localeCompare(b.name)),
          latencyMs,
        ),
      listDocuments: () => delay([...portal.documents].sort((a, b) => b.addedOn.localeCompare(a.addedOn)), latencyMs),
      listRegistrationsForHousehold: (householdId) =>
        delay(
          portal.registrations
            .filter((r) => r.householdId === householdId)
            .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
          latencyMs,
        ),
      listRegistrationsForEvent: (eventId) =>
        delay(
          portal.registrations
            .filter((r) => r.eventId === eventId)
            .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
          latencyMs,
        ),
      listSignInAttempts: () =>
        delay([...portal.signInAttempts].sort((a, b) => b.lastTriedAt.localeCompare(a.lastTriedAt)), latencyMs),

      register: (input) => {
        if (!household(input.householdId)) return Promise.reject(new Error('That household is not on the list.'))
        if (input.adults < 1) return Promise.reject(new Error('At least one adult has to come.'))
        const existing = portal.registrations.find(
          (r) => r.eventId === input.eventId && r.householdId === input.householdId,
        )
        const saved: Registration = {
          id: existing?.id ?? id('reg'),
          eventId: input.eventId,
          householdId: input.householdId,
          adults: input.adults,
          children: input.children,
          helping: input.helping?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          registeredAt: existing?.registeredAt ?? now().toISOString(),
        }
        if (existing) Object.assign(existing, saved)
        else portal.registrations.push(saved)
        recountEvent(input.eventId)
        return delay(saved, latencyMs)
      },

      cancelRegistration: (registrationId) => {
        const index = portal.registrations.findIndex((r) => r.id === registrationId)
        if (index === -1) return Promise.reject(new Error('That registration has already gone.'))
        const [removed] = portal.registrations.splice(index, 1)
        recountEvent(removed.eventId)
        return delay(undefined, latencyMs)
      },

      updateHousehold: (householdId, patch) => {
        const found = household(householdId)
        if (!found) return Promise.reject(new Error('That household is not on the list.'))
        Object.assign(found, patch)
        return delay({ ...found }, latencyMs)
      },

      addHousehold: (input) => {
        const address = input.googleEmail.trim().toLowerCase()
        if (portal.households.some((h) => h.googleEmail === address)) {
          return Promise.reject(new Error('That Google address already belongs to a household.'))
        }
        const created: Household = {
          id: id('hh'),
          name: input.name.trim(),
          contactName: input.contactName.trim(),
          email: input.email.trim(),
          phone: input.phone?.trim() || undefined,
          googleEmail: address,
          // Only the contact to begin with. The household names the rest themselves, so the
          // committee is never asked to invent people it has not met.
          people: [{ id: id('p'), name: input.contactName.trim(), ageGroup: 'adult' }],
          interests: [],
          memberSince: now().toISOString().slice(0, 10),
          membership: { status: 'active', paidTo: '' },
          role: input.role,
          listedInDirectory: false,
          shareEmail: false,
          sharePhone: false,
        }
        portal.households.push(created)
        const knocking = portal.signInAttempts.find((a) => a.email === address)
        if (knocking) knocking.resolved = true
        return delay(created, latencyMs)
      },

      setRole: (householdId, role) => {
        const found = household(householdId)
        if (!found) return Promise.reject(new Error('That household is not on the list.'))
        const admins = portal.households.filter((h) => h.role === 'admin')
        if (role === 'member' && admins.length === 1 && admins[0].id === householdId) {
          return Promise.reject(
            new Error('Somebody has to be able to let people in. Make another household an admin first.'),
          )
        }
        found.role = role
        return delay({ ...found }, latencyMs)
      },

      resolveSignInAttempt: (attemptId) => {
        const found = portal.signInAttempts.find((a) => a.id === attemptId)
        if (found) found.resolved = true
        return delay(undefined, latencyMs)
      },
    },
    siteText: {
      get: () => delay({ ...siteText }, latencyMs),
      update: (patch) => {
        siteText = { ...siteText, ...patch }
        return delay({ ...siteText }, latencyMs)
      },
    },
    volunteering: {
      listOpenRoles: () => delay(fixtures.volunteerRoles.filter((r) => r.filled < r.slots), latencyMs),
      listRolesForEvent: (eventId) => delay(fixtures.volunteerRoles.filter((r) => r.eventId === eventId), latencyMs),
    },
  }
}
