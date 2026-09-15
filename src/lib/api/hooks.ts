import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ContactInput } from '@/domain/contact'
import type { AttendanceDraft } from '@/domain/attendance'
import type { EventDraft } from '@/domain/event'
import type { SettingsDraft } from '@/domain/settings'
import type { AlbumDraft } from '@/domain/gallery'
import type { AnnouncementDraft, NewsDraft } from '@/domain/news'
import type { HouseholdDraft, Viewer } from '@/domain/household'
import { useSignedIn } from '@/lib/auth/session'
import { useApi } from './context'
import type { ApiClient } from './types'

/**
 * Who the current request is being made by. The real client will put this in a token; here it
 * is read from the session and handed to the API explicitly, which keeps it visible.
 */
export function useViewer(): Viewer {
  const who = useSignedIn()
  return who ? { householdId: who.householdId, role: who.role } : null
}

/**
 * The part of a query key that says who asked.
 *
 * Every query that depends on the viewer carries this, because React Query caches by key and
 * nothing else: without it, signing out of an admin account and into a member one would serve
 * the member whatever the admin had already fetched. The data would be wrong and — worse —
 * would be wrong in the direction of showing somebody more than they should see.
 */
function asks(viewer: Viewer): string {
  return viewer ? `${viewer.role}:${viewer.householdId}` : 'visitor'
}

export function useNextEvent() {
  const api = useApi()
  return useQuery({ queryKey: ['events', 'next'], queryFn: () => api.events.getNext() })
}

export function useUpcomingEvents(limit = 4) {
  const api = useApi()
  return useQuery({ queryKey: ['events', 'upcoming', limit], queryFn: () => api.events.listUpcoming(limit) })
}

export function usePastEvents(limit = 10) {
  const api = useApi()
  return useQuery({ queryKey: ['events', 'past', limit], queryFn: () => api.events.listPast(limit) })
}

export function useEvent(slug: string) {
  const api = useApi()
  return useQuery({ queryKey: ['events', 'slug', slug], queryFn: () => api.events.getBySlug(slug) })
}

export function useEventVolunteerRoles(eventId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: ['volunteering', 'event', eventId],
    queryFn: () => api.volunteering.listRolesForEvent(eventId ?? ''),
    enabled: Boolean(eventId),
  })
}

export function useNewsPosts(limit = 20) {
  const api = useApi()
  return useQuery({ queryKey: ['news', 'posts', limit], queryFn: () => api.news.listPosts(limit) })
}

export function useNewsPost(slug: string) {
  const api = useApi()
  return useQuery({ queryKey: ['news', 'post', slug], queryFn: () => api.news.getPost(slug) })
}

export function useAnnouncements() {
  const api = useApi()
  return useQuery({ queryKey: ['news', 'announcements'], queryFn: () => api.news.listAnnouncements() })
}

export function useNewsletters() {
  const api = useApi()
  return useQuery({ queryKey: ['news', 'newsletters'], queryFn: () => api.news.listNewsletters() })
}

export function useSendContact() {
  const api = useApi()
  return useMutation({ mutationFn: (input: ContactInput) => api.contact.send(input) })
}

export function useHousehold(id: string | undefined) {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['portal', 'household', id, asks(viewer)],
    queryFn: () => api.portal.getHousehold(id ?? '', viewer),
    enabled: Boolean(id),
  })
}

export function useHouseholds() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['portal', 'households', asks(viewer)],
    queryFn: () => api.portal.listHouseholds(viewer),
  })
}

export function useDirectory() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['portal', 'directory', asks(viewer)],
    queryFn: () => api.portal.listDirectory(viewer),
  })
}

export function useDocuments() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['portal', 'documents', asks(viewer)],
    queryFn: () => api.portal.listDocuments(viewer),
  })
}

export function useSignInAttempts() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['portal', 'sign-in-attempts', asks(viewer)],
    queryFn: () => api.portal.listSignInAttempts(viewer),
  })
}

export function useContactMessages() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['contact', 'messages', asks(viewer)],
    queryFn: () => api.contact.listMessages(viewer),
  })
}

/**
 * Marks a message dealt with. The first write in the app, and the pattern every later one
 * follows: call through the client, then invalidate the queries whose answers just changed,
 * so the screen reflects the database rather than what the mutation hoped it did.
 */
export function useMarkMessageHandled() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.contact.markHandled(id, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['contact', 'messages'] }),
  })
}

/**
 * Inviting a household, and saving one. Both invalidate the whole portal tree rather than one
 * key: a household appears in the directory, in the committee's list, in its own page and in
 * the counts on the overview, and a write that refreshed only the screen it was made from
 * would leave the others quietly stale.
 */
export function useAddHousehold() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (draft: HouseholdDraft) => api.portal.addHousehold(draft, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['portal'] }),
  })
}

export function useUpdateHousehold() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: HouseholdDraft }) =>
      api.portal.updateHousehold(id, draft, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['portal'] }),
  })
}

/**
 * Everything held about one household, fetched only when somebody asks for it.
 *
 * `enabled: false` and called through `refetch`, because this is an answer to a question, not
 * something to have on hand: assembling it reaches across most of the tables, and a household
 * opening their own page has not asked for it.
 */
export function useResolveSignInAttempt() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.portal.resolveSignInAttempt(id, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['portal'] }),
  })
}

export function useAttendance() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['portal', 'attendance', asks(viewer)],
    queryFn: () => api.portal.listAttendance(viewer),
  })
}

export function useRecordAttendance() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (draft: AttendanceDraft) => api.portal.recordAttendance(draft, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['portal'] }),
  })
}

export function useDeleteHousehold() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.portal.deleteHousehold(id, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['portal'] }),
  })
}

export function useHouseholdExport(id: string | undefined) {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['portal', 'export', id, asks(viewer)],
    queryFn: () => api.portal.exportHousehold(id ?? '', viewer),
    enabled: false,
    gcTime: 0,
  })
}

export function useFestivals() {
  const api = useApi()
  return useQuery({ queryKey: ['festivals'], queryFn: () => api.festivals.list() })
}

export function useRecentMedia(limit = 6) {
  const api = useApi()
  return useQuery({ queryKey: ['gallery', 'recent', limit], queryFn: () => api.gallery.listRecentMedia(limit) })
}

export function useAlbums() {
  const api = useApi()
  return useQuery({ queryKey: ['gallery', 'albums'], queryFn: () => api.gallery.listAlbums() })
}

export function useAlbum(slug: string) {
  const api = useApi()
  return useQuery({ queryKey: ['gallery', 'album', slug], queryFn: () => api.gallery.getAlbum(slug) })
}

/**
 * Every album, published or not. The committee's view of the gallery.
 */
export function useAllEvents() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['events', 'all', asks(viewer)], queryFn: () => api.events.listAll(viewer) })
}

export function useCreateEvent() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (draft: EventDraft) => api.events.create(draft, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useArchiveEvent() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.events.archive(id, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useSaveEvent() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: EventDraft }) => api.events.save(id, draft, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useSaveSettings() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (draft: SettingsDraft) => api.settings.save(draft, viewer),
    // Everything is downstream of these: the navigation, the home page, the header.
    onSuccess: () => queries.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export function useAllPosts() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['news', 'all-posts', asks(viewer)], queryFn: () => api.news.listAllPosts(viewer) })
}

export function useAllAnnouncements() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['news', 'all-announcements', asks(viewer)],
    queryFn: () => api.news.listAllAnnouncements(viewer),
  })
}

/** Writes on the news tree. Invalidates all of it: a piece shows in the list and on the home page. */
function useNewsWrite<A>(run: (api: ApiClient, viewer: Viewer, args: A) => Promise<unknown>) {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (args: A) => run(api, viewer, args),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['news'] }),
  })
}

export const useCreatePost = () => useNewsWrite((api, viewer, draft: NewsDraft) => api.news.createPost(draft, viewer))
export const useUpdatePost = () =>
  useNewsWrite((api, viewer, { id, draft }: { id: string; draft: NewsDraft }) => api.news.updatePost(id, draft, viewer))
export const useCreateAnnouncement = () =>
  useNewsWrite((api, viewer, draft: AnnouncementDraft) => api.news.createAnnouncement(draft, viewer))
export const useUpdateAnnouncement = () =>
  useNewsWrite((api, viewer, { id, draft }: { id: string; draft: AnnouncementDraft }) =>
    api.news.updateAnnouncement(id, draft, viewer),
  )
export const useRemoveAnnouncement = () => useNewsWrite((api, viewer, id: string) => api.news.removeAnnouncement(id, viewer))

export function useAllAlbums() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['gallery', 'all', asks(viewer)],
    queryFn: () => api.gallery.listAllAlbums(viewer),
  })
}

/**
 * The gallery writes. Each invalidates the whole gallery tree rather than one key: a
 * photograph shows in its album, in the recent strip on the home page, and as somebody's
 * cover, and a write that refreshed only the screen it was made from would leave the rest
 * quietly wrong.
 */
function useGalleryWrite<A>(run: (api: ApiClient, viewer: Viewer, args: A) => Promise<unknown>) {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (args: A) => run(api, viewer, args),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['gallery'] }),
  })
}

export const useCreateAlbum = () =>
  useGalleryWrite((api, viewer, draft: AlbumDraft) => api.gallery.createAlbum(draft, viewer))

export const useUpdateAlbum = () =>
  useGalleryWrite((api, viewer, { id, draft }: { id: string; draft: AlbumDraft }) =>
    api.gallery.updateAlbum(id, draft, viewer),
  )

export const useSetCover = () =>
  useGalleryWrite((api, viewer, { albumId, mediaId }: { albumId: string; mediaId: string }) =>
    api.gallery.setCover(albumId, mediaId, viewer),
  )

export const useSetCaption = () =>
  useGalleryWrite((api, viewer, { mediaId, caption }: { mediaId: string; caption: string }) =>
    api.gallery.setCaption(mediaId, caption, viewer),
  )

export const useReorderMedia = () =>
  useGalleryWrite((api, viewer, { albumId, mediaIds }: { albumId: string; mediaIds: string[] }) =>
    api.gallery.reorder(albumId, mediaIds, viewer),
  )

export const useDeleteMedia = () =>
  useGalleryWrite((api, viewer, id: string) => api.gallery.deleteMedia(id, viewer))

export function useOpenVolunteerRoles() {
  const api = useApi()
  return useQuery({ queryKey: ['volunteering', 'open'], queryFn: () => api.volunteering.listOpenRoles() })
}
