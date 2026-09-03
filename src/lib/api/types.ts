import type { Event } from '@/domain/event'
import type { EventRegistration, EventRegistrationInput } from '@/domain/event-registration'
import type { Festival } from '@/domain/festival'
import type { AlbumWithMedia, Media } from '@/domain/gallery'
import type { ContactInput, ContactMessage } from '@/domain/contact'
import type { CommunityDocument, SignInAttempt } from '@/domain/document'
import type { Household, Role } from '@/domain/household'
import type { Registration } from '@/domain/registration'
import type { SiteText } from '@/domain/site-text'
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
    /**
     * Registers a party for an event from the public site. Rejects when the input is
     * invalid, or when submissions have nowhere to go.
     */
    register(slug: string, input: EventRegistrationInput): Promise<EventRegistration>
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
    /**
     * The committee's inbox, newest first. Admin only. The public table is insert-only,
     * so reading this from the browser will need a policy for signed-in admins.
     */
    listMessages(): Promise<(ContactMessage & { handledBy?: string })[]>
  }
  /** Everything behind the sign-in. */
  portal: {
    /** The household the signed-in person belongs to. */
    getHousehold(id: string): Promise<Household | null>
    /** Every household, for the committee. */
    listHouseholds(): Promise<Household[]>
    /** Households that chose to appear, for members. */
    listDirectory(): Promise<Household[]>
    listDocuments(): Promise<CommunityDocument[]>
    /** One household's registrations, newest event first. */
    listRegistrationsForHousehold(householdId: string): Promise<Registration[]>
    /** Every registration for one event, newest first. */
    listRegistrationsForEvent(eventId: string): Promise<Registration[]>
    /** Google accounts that signed in but matched no household. */
    listSignInAttempts(): Promise<SignInAttempt[]>

    /** Registers a household for an event, or changes what it already said. */
    register(input: RegistrationInput): Promise<Registration>
    /** Withdraws a household from an event. */
    cancelRegistration(id: string): Promise<void>

    /** Changes the parts of a household its own members may change. */
    updateHousehold(id: string, patch: HouseholdPatch): Promise<Household>

    /** Committee only. Adds a household, which is the only way anybody gets in. */
    addHousehold(input: NewHousehold): Promise<Household>
    /** Committee only. Makes somebody an admin, or takes it back. */
    setRole(id: string, role: Role): Promise<Household>
    /** Committee only. Marks a knock at the door as dealt with. */
    resolveSignInAttempt(id: string): Promise<void>
  }
  /** The wording on the public site, which the committee owns. */
  siteText: {
    get(): Promise<SiteText>
    /** Committee only. */
    update(patch: Partial<SiteText>): Promise<SiteText>
  }
  volunteering: {
    /** Roles that still have free slots. */
    listOpenRoles(): Promise<VolunteerRole[]>
    /** Every role attached to an event, full or not. */
    listRolesForEvent(eventId: string): Promise<VolunteerRole[]>
  }
}

export type RegistrationInput = {
  eventId: string
  householdId: string
  adults: number
  children: number
  helping?: string
  notes?: string
}

/** What a household may change about itself. Role, sign-in address and membership are not here. */
export type HouseholdPatch = Partial<
  Pick<Household, 'contactName' | 'email' | 'phone' | 'people' | 'interests' | 'listedInDirectory' | 'shareEmail' | 'sharePhone'>
>

export type NewHousehold = {
  name: string
  contactName: string
  email: string
  phone?: string
  googleEmail: string
  role: Role
  invite: boolean
}
