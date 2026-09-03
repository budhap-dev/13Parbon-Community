export type VolunteerRole = {
  id: string
  eventId?: string
  title: string
  description: string
  slots: number
  filled: number
  /** Human-readable time, e.g. "Saturday morning". */
  when?: string
}

export function slotsRemaining(role: Pick<VolunteerRole, 'slots' | 'filled'>): number {
  return Math.max(0, role.slots - role.filled)
}
