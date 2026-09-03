import type { Event } from '@/domain/event'
import type { Festival } from '@/domain/festival'
import type { Media } from '@/domain/gallery'
import type { VolunteerRole } from '@/domain/volunteer'

/**
 * The contract between the UI and whatever backend we pick.
 * Components never call fetch; they go through this client via hooks.
 */
export interface ApiClient {
  events: {
    /** Published, public events from today onwards, soonest first. */
    listUpcoming(limit?: number): Promise<Event[]>
    getNext(): Promise<Event | null>
  }
  festivals: {
    list(): Promise<Festival[]>
  }
  gallery: {
    /** Approved media from public albums, newest first. */
    listRecentMedia(limit?: number): Promise<Media[]>
  }
  volunteering: {
    /** Roles that still have free slots. */
    listOpenRoles(): Promise<VolunteerRole[]>
  }
}
