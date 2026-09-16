import type { SignedIn } from './session'

/**
 * Stand-in accounts so the portal can be walked through before Google sign-in exists.
 * These are sample households from the mock data, not real people.
 */
export const previewAccounts: (SignedIn & { blurb: string })[] = [
  {
    preview: true,
    role: 'member',
    householdId: 'hh-sen',
    householdName: 'The Sens',
    name: 'Rina Sen',
    email: 'rina.sen@gmail.com',
    blurb: 'An ordinary household. Has not registered for the next event yet.',
  },
  {
    preview: true,
    role: 'admin',
    householdId: 'hh-chatterjee',
    householdName: 'The Chatterjees',
    name: 'Debashis Chatterjee',
    email: 'd.chatterjee@gmail.com',
    blurb: 'On the committee. Sees everything a member sees, plus the committee section.',
  },
]

/**
 * Whether the sign-in page should offer the sample households.
 *
 * Development only. It used to honour `?preview` anywhere, which meant any visitor who knew the
 * trick could walk into the committee's back office on the live site — not a way to anybody's
 * data, since the database answers to the token and a preview holds none, but the committee's
 * screens are not a public exhibit either.
 *
 * On the live site the walkthrough belongs to whoever is already signed in as an admin, and it
 * is offered from inside the portal instead. Kept here for development because a machine with
 * no project configured and no Google sign-in has no other way into the portal at all.
 *
 * Callers pass `import.meta.env.MODE === 'development'` rather than `DEV`, because the test
 * runner reports DEV as true and the preview would then appear in every test.
 */
export function previewEnabled(isDevelopment: boolean): boolean {
  return isDevelopment
}
