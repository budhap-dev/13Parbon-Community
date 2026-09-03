import { useQuery } from '@tanstack/react-query'
import { useApi } from './context'

export function useNextEvent() {
  const api = useApi()
  return useQuery({ queryKey: ['events', 'next'], queryFn: () => api.events.getNext() })
}

export function useUpcomingEvents(limit = 4) {
  const api = useApi()
  return useQuery({ queryKey: ['events', 'upcoming', limit], queryFn: () => api.events.listUpcoming(limit) })
}

export function useFestivals() {
  const api = useApi()
  return useQuery({ queryKey: ['festivals'], queryFn: () => api.festivals.list() })
}

export function useRecentMedia(limit = 6) {
  const api = useApi()
  return useQuery({ queryKey: ['gallery', 'recent', limit], queryFn: () => api.gallery.listRecentMedia(limit) })
}

export function useOpenVolunteerRoles() {
  const api = useApi()
  return useQuery({ queryKey: ['volunteering', 'open'], queryFn: () => api.volunteering.listOpenRoles() })
}
