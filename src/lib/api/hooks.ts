import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { defaultSiteText } from '@/app/site'
import type { ContactInput } from '@/domain/contact'
import type { EventRegistrationInput } from '@/domain/event-registration'
import type { SiteText } from '@/domain/site-text'
import { useApi } from './context'

export function useNextEvent() {
  const api = useApi()
  return useQuery({ queryKey: ['events', 'next'], queryFn: () => api.events.getNext() })
}

export function useUpcomingEvents(limit = 4) {
  const api = useApi()
  return useQuery({ queryKey: ['events', 'upcoming', limit], queryFn: () => api.events.listUpcoming(limit) })
}

export function useRegisterForEvent(slug: string) {
  const api = useApi()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: EventRegistrationInput) => api.events.register(slug, input),
    // The headcount just changed, so anything showing it should say so.
    onSuccess: () => client.invalidateQueries({ queryKey: ['events'] }),
  })
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
  return useQuery({
    queryKey: ['portal', 'household', id],
    queryFn: () => api.portal.getHousehold(id ?? ''),
    enabled: Boolean(id),
  })
}

export function useHouseholds() {
  const api = useApi()
  return useQuery({ queryKey: ['portal', 'households'], queryFn: () => api.portal.listHouseholds() })
}

export function useDirectory() {
  const api = useApi()
  return useQuery({ queryKey: ['portal', 'directory'], queryFn: () => api.portal.listDirectory() })
}

export function useDocuments() {
  const api = useApi()
  return useQuery({ queryKey: ['portal', 'documents'], queryFn: () => api.portal.listDocuments() })
}

export function useHouseholdRegistrations(householdId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: ['portal', 'registrations', 'household', householdId],
    queryFn: () => api.portal.listRegistrationsForHousehold(householdId ?? ''),
    enabled: Boolean(householdId),
  })
}

export function useEventRegistrations(eventId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: ['portal', 'registrations', 'event', eventId],
    queryFn: () => api.portal.listRegistrationsForEvent(eventId ?? ''),
    enabled: Boolean(eventId),
  })
}

export function useSignInAttempts() {
  const api = useApi()
  return useQuery({ queryKey: ['portal', 'sign-in-attempts'], queryFn: () => api.portal.listSignInAttempts() })
}

export function useContactMessages() {
  const api = useApi()
  return useQuery({ queryKey: ['contact', 'messages'], queryFn: () => api.contact.listMessages() })
}

/**
 * The wording the committee owns. Starts from the built-in defaults so nothing flashes
 * empty, then shows the saved version once it arrives.
 */
export function useSiteText(): SiteText {
  const api = useApi()
  const { data } = useQuery({
    queryKey: ['site-text'],
    queryFn: () => api.siteText.get(),
    initialData: defaultSiteText,
    staleTime: 60_000,
  })
  return data
}

export function useUpdateSiteText() {
  const api = useApi()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<SiteText>) => api.siteText.update(patch),
    onSuccess: (text) => client.setQueryData(['site-text'], text),
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

export function useOpenVolunteerRoles() {
  const api = useApi()
  return useQuery({ queryKey: ['volunteering', 'open'], queryFn: () => api.volunteering.listOpenRoles() })
}
