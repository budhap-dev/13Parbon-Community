import type { Event, EventDraft } from '@/domain/event'
import type { Festival } from '@/domain/festival'
import type { Album, AlbumDraft, AlbumWithMedia, Media } from '@/domain/gallery'
import type { ContactInput, ContactMessage, ContactReceipt } from '@/domain/contact'
import type { CommunityDocument, SignInAttempt } from '@/domain/document'
import type { Household, HouseholdDraft, Viewer } from '@/domain/household'
import type { AttendanceDraft, EventAttendance } from '@/domain/attendance'
import type { AuditEntry } from '@/domain/audit'
import type { SettingsDraft, SiteSettings } from '@/domain/settings'
import type { HouseholdExport } from '@/domain/subjectAccess'
import type { Announcement, AnnouncementDraft, NewsDraft, NewsPost, Newsletter } from '@/domain/news'
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
    /** Every event, drafts and past ones included. Empty for anybody who is not an admin. */
    listAll(viewer: Viewer): Promise<Event[]>
    /**
     * Saves how an event is presented.
     *
     * The committee's planner holds the logistics; this holds front of house. They overlap on
     * the title, the date and the venue and nowhere else.
     */
    save(id: string, draft: EventDraft, viewer: Viewer): Promise<Event>
    /**
     * Adds an evening. Admin only, and it arrives as a draft whatever the form says.
     *
     * Front of house is created here because front of house is what this site owns. The planner
     * holds the logistics, and when it grows a way to hand over a title, a date and a venue it
     * will fill the same three fields somebody types now.
     */
    create(draft: EventDraft, viewer: Viewer): Promise<Event>
    /**
     * Files an evening as past.
     *
     * Not automatic on the date: a date passing is not the same as the committee being finished
     * with it, and an event that tidied itself away while somebody was writing the round-up
     * would be its own small annoyance. The screen offers; a person decides.
     */
    archive(id: string, viewer: Viewer): Promise<Event>
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
    /** Every album, published or not, for the committee. Empty for anybody else. */
    listAllAlbums(viewer: Viewer): Promise<AlbumWithMedia[]>
    createAlbum(draft: AlbumDraft, viewer: Viewer): Promise<Album>
    updateAlbum(id: string, draft: AlbumDraft, viewer: Viewer): Promise<Album>
    /**
     * Chooses the photograph that stands for an album. Admin only.
     *
     * Deliberately a decision somebody makes, rather than the first or a random one: the
     * picture that represents a night is a judgement, and an album that changes its face on
     * every reload cannot be pointed at.
     */
    setCover(albumId: string, mediaId: string, viewer: Viewer): Promise<Album>
    setCaption(mediaId: string, caption: string, viewer: Viewer): Promise<Media>
    /** The photographs of one album, in the order they should appear. Admin only. */
    reorder(albumId: string, mediaIds: string[], viewer: Viewer): Promise<Media[]>
    /**
     * Removes a photograph for good.
     *
     * **This has to delete the object in the bucket, not only the row.** The privacy page
     * promises to take down any photograph a member or their child appears in, on request and
     * without a reason — and a photograph that is merely unlisted has not been taken down. Any
     * adapter that hides a row and leaves the file at `photos.13parbon.org.uk` has broken the
     * promise while appearing to keep it, because the URL still works for anyone who has it.
     *
     * To hide a picture without destroying it, set its album to `members` instead.
     */
    deleteMedia(id: string, viewer: Viewer): Promise<void>
  }
  news: {
    /** Published posts, newest first. */
    listPosts(limit?: number): Promise<NewsPost[]>
    getPost(slug: string): Promise<NewsPost | null>
    /** Live public announcements, pinned first then newest. */
    listAnnouncements(): Promise<Announcement[]>
    /** Newsletters, newest first. */
    listNewsletters(): Promise<Newsletter[]>

    /** Every post including drafts, newest first. Empty for anybody who is not an admin. */
    listAllPosts(viewer: Viewer): Promise<NewsPost[]>
    /** Every announcement, whatever its audience or dates. Empty for anybody who is not an admin. */
    listAllAnnouncements(viewer: Viewer): Promise<Announcement[]>

    createPost(draft: NewsDraft, viewer: Viewer): Promise<NewsPost>
    updatePost(id: string, draft: NewsDraft, viewer: Viewer): Promise<NewsPost>
    createAnnouncement(draft: AnnouncementDraft, viewer: Viewer): Promise<Announcement>
    updateAnnouncement(id: string, draft: AnnouncementDraft, viewer: Viewer): Promise<Announcement>
    /**
     * Takes an announcement off the board.
     *
     * Really gone, unlike a news post: an announcement is a note on a noticeboard, and there is
     * no version of it worth keeping once it stops being true. A post is a piece of writing, so
     * that gets unpublished instead — `published: false` on the draft — and stays there to be
     * put back.
     */
    removeAnnouncement(id: string, viewer: Viewer): Promise<void>
  }
  contact: {
    /**
     * Sends a message to the committee. Rejects with an Error when the input is invalid.
     *
     * Returns a receipt, not the stored row: the public website cannot read this table back,
     * so there is no row to return. See `ContactReceipt`.
     */
    send(input: ContactInput): Promise<ContactReceipt>
    /** The committee's inbox, newest first. Empty for anybody who is not an admin. */
    listMessages(viewer: Viewer): Promise<ContactMessage[]>
    /**
     * Marks a message dealt with, and by whom. Rejects for anybody who is not an admin.
     *
     * The smallest write there is, and deliberately the first: it exercises the whole path —
     * contract, mock, mutation, cache invalidation — on something with nothing at stake.
     */
    markHandled(id: string, viewer: Viewer, note?: string): Promise<ContactMessage>
    /**
     * Removes a message for good. Admin only.
     *
     * Really gone, and worth pausing over: a message is the only record the committee holds of
     * something somebody asked for. A takedown request is evidence of a promise made and kept,
     * and the subject-access export finds a household's messages by matching the address they
     * wrote from — so a message deleted today is one that cannot be handed back tomorrow.
     *
     * Kept anyway, because the alternative is an inbox that fills with spam and stops being
     * read, and an inbox nobody reads is worse for the person waiting in it. Marking a message
     * handled is what to do with one that mattered; this is for the ones that never did.
     */
    deleteMessage(id: string, viewer: Viewer): Promise<void>
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
    /** The documents library. Empty for anybody who is not a member. */
    listDocuments(viewer: Viewer): Promise<CommunityDocument[]>
    /**
     * How many came to each event, newest first. Readable by any member: it is the history the
     * portal shows, and there is nobody in it.
     */
    listAttendance(viewer: Viewer): Promise<EventAttendance[]>
    /**
     * Records how many came. Admin only, and one record per event — saving again corrects it.
     *
     * Typed in rather than counted up. Bookings live in the committee's Google Form and stay
     * there; a number is the only thing that needs to cross, and it brings nobody with it.
     */
    recordAttendance(draft: AttendanceDraft, viewer: Viewer): Promise<EventAttendance>
    /** Google accounts that signed in but matched no household. Admin only. */
    listSignInAttempts(viewer: Viewer): Promise<SignInAttempt[]>
    /**
     * Invites a household. Admin only — this is the whole invitation model, and the reason
     * there is no application form anywhere in the app.
     */
    addHousehold(draft: HouseholdDraft, viewer: Viewer): Promise<Household>
    /**
     * Saves a household. A member may save their own; the committee may save any.
     *
     * The committee's fields on the draft are refused, not ignored, when they come from a
     * member — the same answer the database's trigger gives, and for the same reason: a draft
     * is whatever the browser chose to send, and a form that does not show a field is no
     * guarantee that nobody sent one.
     */
    updateHousehold(id: string, draft: HouseholdDraft, viewer: Viewer): Promise<Household>
    /**
     * Everything held about one household, for handing to them when they ask.
     *
     * A household may take its own; the committee may take any — and should, before deleting
     * anybody, because erasure leaves the audit trail anonymous and the account of what that
     * household did goes with it.
     */
    exportHousehold(id: string, viewer: Viewer): Promise<HouseholdExport>
    /**
     * Erases a household: the record, everybody in it, and everything they were recorded at.
     *
     * Decided 2026-09-15 — the registrations go too, which is what the schema already does
     * (`on delete cascade`) and the cleaner reading of erasure. The cost is real and worth
     * stating: past events lose those headcounts, so the attendance history thins out behind
     * you. Take the export first; it is the only copy there will be.
     *
     * Admin only, never your own household, and never the last admin.
     */
    deleteHousehold(id: string, viewer: Viewer): Promise<void>
    /**
     * Marks a knock as dealt with — they were added, or the committee decided not to.
     *
     * Kept rather than removed, so somebody turned away twice does not read as somebody turned
     * away once. The list on the People screen shows what is still waiting.
     */
    resolveSignInAttempt(id: string, viewer: Viewer): Promise<SignInAttempt>
  }
  /**
   * The switches the committee can throw without a developer.
   *
   * Readable by anybody, including a visitor: they decide what the public site shows, so the
   * public site has to be able to ask. Writable by the committee alone.
   */
  settings: {
    get(): Promise<SiteSettings>
    save(draft: SettingsDraft, viewer: Viewer): Promise<SiteSettings>
  }
  /**
   * What has been changed, and by whom. Written by `withAuditTrail` here and by a trigger in
   * the database; read by the committee and nobody else.
   */
  audit: {
    list(viewer: Viewer, limit?: number): Promise<AuditEntry[]>
  }
  volunteering: {
    /** Roles that still have free slots. */
    listOpenRoles(): Promise<VolunteerRole[]>
    /** Every role attached to an event, full or not. */
    listRolesForEvent(eventId: string): Promise<VolunteerRole[]>
  }
}
