import type { Event } from '@/domain/event'
import type { Festival } from '@/domain/festival'
import type { AlbumWithMedia, Media } from '@/domain/gallery'
import type { ContactInput, ContactMessage } from '@/domain/contact'
import type { MembershipApplication, MembershipApplicationInput } from '@/domain/membership'
import type { Announcement, NewsPost, Newsletter } from '@/domain/news'
import type { VolunteerRole } from '@/domain/volunteer'

/**
 * The contract between the UI and whatever backend we pick.
 * Components never call fetch; they go through this client via hooks.
 */
export interface ApiClient {
  events: {
    /** Published, public events from today onwards, soonest first. */
    listUpcoming(limit?: number): Promise<Event[]>
    /** Published, public events that have already happened, most recent first. */
    listPast(limit?: number): Promise<Event[]>
    getNext(): Promise<Event | null>
    /** A published, public event by slug, or null. */
    getBySlug(slug: string): Promise<Event | null>
  }
  festivals: {
    list(): Promise<Festival[]>
  }
  gallery: {
    /** Approved media from public albums, newest first. */
    listRecentMedia(limit?: number): Promise<Media[]>
    /** Public albums with their approved media, newest first. */
    listAlbums(): Promise<AlbumWithMedia[]>
    getAlbum(slug: string): Promise<AlbumWithMedia | null>
  }
  news: {
    /** Published posts, newest first. */
    listPosts(limit?: number): Promise<NewsPost[]>
    getPost(slug: string): Promise<NewsPost | null>
    /** Live public announcements, pinned first then newest. */
    listAnnouncements(): Promise<Announcement[]>
    /** Newsletters, newest first. */
    listNewsletters(): Promise<Newsletter[]>
  }
  contact: {
    /** Sends a message to the committee. Rejects with an Error when the input is invalid. */
    send(input: ContactInput): Promise<ContactMessage>
  }
  membership: {
    /** Submits a membership application for the committee to approve. Rejects when invalid. */
    apply(input: MembershipApplicationInput): Promise<MembershipApplication>
  }
  volunteering: {
    /** Roles that still have free slots. */
    listOpenRoles(): Promise<VolunteerRole[]>
    /** Every role attached to an event, full or not. */
    listRolesForEvent(eventId: string): Promise<VolunteerRole[]>
  }
}
