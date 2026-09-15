import type { Event } from '@/domain/event'
import type { Festival } from '@/domain/festival'
import type { AlbumWithMedia, Media } from '@/domain/gallery'
import type { ContactInput, ContactMessage } from '@/domain/contact'
import type { CommunityDocument, SignInAttempt } from '@/domain/document'
import type { DirectoryEntry, Household, Viewer } from '@/domain/household'
import type { Registration } from '@/domain/registration'
import type { Announcement, NewsPost, Newsletter } from '@/domain/news'
import type { VolunteerRole } from '@/domain/volunteer'

/**
 * The contract between the UI and whatever backend we pick.
 * Components never call fetch; they go through this client via hooks.
 */
export interface ApiClient {
  /**
   * Whether what a visitor submits actually reaches the committee. False on the mock,
   * so pages can offer email instead of pretending a message was delivered.
   */
  readonly delivers: boolean
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
    /** The committee's inbox, newest first. Empty for anybody who is not an admin. */
    listMessages(viewer: Viewer): Promise<ContactMessage[]>
    /**
     * Marks a message dealt with, and by whom. Rejects for anybody who is not an admin.
     *
     * The smallest write there is, and deliberately the first: it exercises the whole path —
     * contract, mock, mutation, cache invalidation — on something with nothing at stake.
     */
    markHandled(id: string, viewer: Viewer): Promise<ContactMessage>
  }
  /**
   * Everything behind the sign-in.
   *
   * Every method here takes a `Viewer`, because every one of them is answered differently
   * depending on who is asking — and because the alternative is a signature that promises
   * more than the database will give. These are written to refuse precisely what
   * `supabase/portal.sql` refuses: a member reaches their own household and nothing else,
   * an admin reaches everything, a visitor reaches none of it.
   */
  portal: {
    /**
     * The household recorded against an address that has just signed in — the one lookup that
     * happens before there is a viewer, because working out what the viewer is *is* its job.
     *
     * The address is the identity here, not a search key. On Supabase this reads a row back
     * through `where google_email = auth.jwt() ->> 'email'`, which row level security narrows
     * to the caller's own household: nobody can look anybody else up with it.
     */
    identify(email: string): Promise<Pick<Household, 'id' | 'name' | 'role'> | null>
    /** A household, if this viewer may see it. Null when they may not, same as when it is missing. */
    getHousehold(id: string, viewer: Viewer): Promise<Household | null>
    /** Every household. Empty for anybody who is not an admin. */
    listHouseholds(viewer: Viewer): Promise<Household[]>
    /**
     * Households that chose to appear, already reduced to what each agreed to share.
     *
     * Returns `DirectoryEntry`, never `Household`: the masking is the API's job, not the
     * page's. A page that filters is a page one refactor away from not filtering.
     */
    listDirectory(viewer: Viewer): Promise<DirectoryEntry[]>
    /** The documents library. Empty for anybody who is not a member. */
    listDocuments(viewer: Viewer): Promise<CommunityDocument[]>
    /** One household's registrations, newest event first. Their own, or an admin's view of any. */
    listRegistrationsForHousehold(householdId: string, viewer: Viewer): Promise<Registration[]>
    /** Every registration for one event, newest first. Admin only. */
    listRegistrationsForEvent(eventId: string, viewer: Viewer): Promise<Registration[]>
    /** Google accounts that signed in but matched no household. Admin only. */
    listSignInAttempts(viewer: Viewer): Promise<SignInAttempt[]>
  }
  volunteering: {
    /** Roles that still have free slots. */
    listOpenRoles(): Promise<VolunteerRole[]>
    /** Every role attached to an event, full or not. */
    listRolesForEvent(eventId: string): Promise<VolunteerRole[]>
  }
}
