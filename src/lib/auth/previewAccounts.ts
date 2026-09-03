import type { SignedIn } from './session'

/**
 * Stand-in accounts so the portal can be walked through before Google sign-in exists.
 * These are sample households from the mock data, not real people.
 */
export const previewAccounts: (SignedIn & { blurb: string })[] = [
  {
    role: 'member',
    householdId: 'hh-sen',
    householdName: 'The Sens',
    name: 'Rina Sen',
    email: 'rina.sen@gmail.com',
    blurb: 'An ordinary household. Has not registered for the next event yet.',
  },
  {
    role: 'admin',
    householdId: 'hh-chatterjee',
    householdName: 'The Chatterjees',
    name: 'Debashis Chatterjee',
    email: 'd.chatterjee@gmail.com',
    blurb: 'On the committee. Sees everything a member sees, plus the committee section.',
  },
]

/**
 * Whether the preview sign-in should be offered. Always while developing; on the live site
 * only when asked for by name, so visitors never stumble into it.
 *
 * Callers pass `import.meta.env.MODE === 'development'` rather than `DEV`, because the test
 * runner reports DEV as true and the preview would then appear in every test.
 */
export function previewEnabled(isDevelopment: boolean, search: string): boolean {
  return isDevelopment || new URLSearchParams(search).has('preview')
}
