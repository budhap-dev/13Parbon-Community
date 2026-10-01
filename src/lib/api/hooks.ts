import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ContactInput } from '@/domain/contact'
import type { FeedbackInput, FeedbackStatus } from '@/domain/feedback'
import type { AttendanceDraft } from '@/domain/attendance'
import type { EventDraft } from '@/domain/event'
import type { SettingsDraft } from '@/domain/settings'
import type { UploadedPhoto } from './uploads'
import type { AlbumDraft } from '@/domain/gallery'
import type { AnnouncementDraft, NewsDraft } from '@/domain/news'
import type { HouseholdDraft, Viewer } from '@/domain/household'
import type { PollDraft } from '@/domain/polls'
import type { QuestionDraft, QuizDraft } from '@/domain/quizzes'
import type { SuggestionDraft, SuggestionStatus } from '@/domain/suggestions'
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
  // Keyed on who is asking: a member sees notices a visitor does not, and a cached visitor
  // answer handed to somebody who has just signed in would hide them.
  const viewer = useViewer()
  return useQuery({
    queryKey: ['news', 'announcements', asks(viewer)],
    queryFn: () => api.news.listAnnouncements(viewer),
  })
}

export function useNewsletters() {
  const api = useApi()
  return useQuery({ queryKey: ['news', 'newsletters'], queryFn: () => api.news.listNewsletters() })
}

export function useSendContact() {
  const api = useApi()
  return useMutation({ mutationFn: (input: ContactInput) => api.contact.send(input) })
}

/**
 * What the public has said about us, as the public sees it.
 *
 * Not keyed on who is asking, unlike the notices: the answer is the same for everybody,
 * because "approved" is the only thing that makes a piece readable and the committee's own
 * queue is a different query. A cached visitor answer handed to an admin is the right answer.
 */
export function useApprovedFeedback(limit = 12) {
  const api = useApi()
  return useQuery({ queryKey: ['feedback', 'approved', limit], queryFn: () => api.feedback.listApproved(limit) })
}

export function useSendFeedback() {
  const api = useApi()
  return useMutation({ mutationFn: (input: FeedbackInput) => api.feedback.send(input) })
}

export function useAllFeedback() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['feedback', 'all', asks(viewer)],
    queryFn: () => api.feedback.listAll(viewer),
  })
}

/**
 * Approving a piece, or turning it down.
 *
 * Both lists are invalidated, not just the queue. Approving *is* publishing — the showcase on
 * the public page is the other half of this write, and a reviewer who approves something and
 * then looks at the page to check would otherwise be shown the cached version without it.
 */
export function useReviewFeedback() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) => api.feedback.review(id, status, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['feedback'] }),
  })
}

export function useRemoveFeedback() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.feedback.remove(id, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['feedback'] }),
  })
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

export function useAuditTrail(limit = 100) {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['audit', limit, asks(viewer)],
    queryFn: () => api.audit.list(viewer, limit),
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
    mutationFn: ({ id, note }: { id: string; note?: string }) => api.contact.markHandled(id, viewer, note),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['contact', 'messages'] }),
  })
}

export function useDeleteMessage() {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.contact.deleteMessage(id, viewer),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['contact', 'messages'] }),
  })
}

/**
 * Inviting a household, and saving one. Both invalidate the whole portal tree rather than one
 * key: a household appears in the committee's list, in its own page and in
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

/**
 * The year's occasions, which the committee keeps with the rest of the site's settings.
 *
 * The same query the settings provider makes, read through a `select`, so the home page asks
 * once rather than twice — and a festival saved in the portal is on the page as soon as the
 * settings are, with nothing separate to remember to refresh.
 */
export function useFestivals() {
  const api = useApi()
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    staleTime: 5 * 60 * 1000,
    select: (settings) => settings.festivals,
  })
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
// Generic in what it gives back as well as what it takes, so a caller can say something about
// what was saved — where a notice went, and when — rather than being handed `unknown`.
function useNewsWrite<A, R>(run: (api: ApiClient, viewer: Viewer, args: A) => Promise<R>) {
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
export const useRemovePost = () => useNewsWrite((api, viewer, id: string) => api.news.removePost(id, viewer))

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

export const useAddMedia = () =>
  useGalleryWrite((api, viewer, { albumId, photo }: { albumId: string; photo: UploadedPhoto }) =>
    api.gallery.addMedia(albumId, photo, viewer),
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

// ---- polls, quizzes and suggestions ------------------------------------------

export function usePolls() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['polls', 'mine', asks(viewer)], queryFn: () => api.polls.list(viewer) })
}

export function useAllPolls() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['polls', 'all', asks(viewer)], queryFn: () => api.polls.listAll(viewer) })
}

/** Writes on polls. The whole tree, because a vote changes the committee's totals too. */
function usePollWrite<A, R>(run: (api: ApiClient, viewer: Viewer, args: A) => Promise<R>) {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (args: A) => run(api, viewer, args),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['polls'] }),
  })
}

export const useVote = () =>
  usePollWrite((api, viewer, { pollId, option }: { pollId: string; option: number }) => api.polls.vote(pollId, option, viewer))
export const useCreatePoll = () => usePollWrite((api, viewer, draft: PollDraft) => api.polls.create(draft, viewer))
export const useUpdatePoll = () =>
  usePollWrite((api, viewer, { id, draft }: { id: string; draft: PollDraft }) => api.polls.update(id, draft, viewer))
export const useRemovePoll = () => usePollWrite((api, viewer, id: string) => api.polls.remove(id, viewer))

export function useQuizzes() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['quizzes', 'list', asks(viewer)], queryFn: () => api.quizzes.list(viewer) })
}

export function useQuiz(id: string) {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['quizzes', 'one', id, asks(viewer)], queryFn: () => api.quizzes.get(id, viewer) })
}

export function useLeaderboard(id: string, enabled = true) {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['quizzes', 'leaderboard', id, asks(viewer)],
    queryFn: () => api.quizzes.leaderboard(id, viewer),
    enabled,
  })
}

export function useAllQuizzes() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['quizzes', 'all', asks(viewer)], queryFn: () => api.quizzes.listAll(viewer) })
}

export function useQuizAttempts(id: string | undefined) {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({
    queryKey: ['quizzes', 'attempts', id, asks(viewer)],
    queryFn: () => api.quizzes.attempts(id ?? '', viewer),
    enabled: Boolean(id),
  })
}

export function useQuestionBank() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['quizzes', 'bank', asks(viewer)], queryFn: () => api.quizzes.bank(viewer) })
}

/** Writes on quizzes. The whole tree: a play changes a card, the leaderboard and the committee's counts. */
function useQuizWrite<A, R>(run: (api: ApiClient, viewer: Viewer, args: A) => Promise<R>) {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (args: A) => run(api, viewer, args),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}

export const useSubmitQuiz = () =>
  useQuizWrite((api, viewer, { id, answers, showName }: { id: string; answers: number[]; showName: boolean }) =>
    api.quizzes.submit(id, answers, showName, viewer),
  )
export const useCreateQuiz = () => useQuizWrite((api, viewer, draft: QuizDraft) => api.quizzes.create(draft, viewer))
export const useUpdateQuiz = () =>
  useQuizWrite((api, viewer, { id, draft }: { id: string; draft: QuizDraft }) => api.quizzes.update(id, draft, viewer))
export const useRemoveQuiz = () => useQuizWrite((api, viewer, id: string) => api.quizzes.remove(id, viewer))
export const useCreateQuestion = () =>
  useQuizWrite((api, viewer, draft: QuestionDraft) => api.quizzes.createQuestion(draft, viewer))
export const useUpdateQuestion = () =>
  useQuizWrite((api, viewer, { id, draft }: { id: string; draft: QuestionDraft }) => api.quizzes.updateQuestion(id, draft, viewer))
export const useRemoveQuestion = () => useQuizWrite((api, viewer, id: string) => api.quizzes.removeQuestion(id, viewer))

export function useMySuggestions() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['suggestions', 'mine', asks(viewer)], queryFn: () => api.suggestions.listMine(viewer) })
}

export function useAllSuggestions() {
  const api = useApi()
  const viewer = useViewer()
  return useQuery({ queryKey: ['suggestions', 'all', asks(viewer)], queryFn: () => api.suggestions.listAll(viewer) })
}

function useSuggestionWrite<A, R>(run: (api: ApiClient, viewer: Viewer, args: A) => Promise<R>) {
  const api = useApi()
  const viewer = useViewer()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: (args: A) => run(api, viewer, args),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['suggestions'] }),
  })
}

export const useSendSuggestion = () =>
  useSuggestionWrite((api, viewer, draft: SuggestionDraft) => api.suggestions.send(draft, viewer))
export const useReviewSuggestion = () =>
  useSuggestionWrite((api, viewer, { id, status }: { id: string; status: SuggestionStatus }) =>
    api.suggestions.review(id, status, viewer),
  )
export const useRemoveSuggestion = () => useSuggestionWrite((api, viewer, id: string) => api.suggestions.remove(id, viewer))
