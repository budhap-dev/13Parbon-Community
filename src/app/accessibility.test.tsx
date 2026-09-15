import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, it } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { expectNoAxeViolations } from '@/test/axe'
import { TestDataProviders } from '@/test/render'
import type { Session } from '@/lib/auth/session'

/**
 * Every page, checked against the automated half of WCAG.
 *
 * PLAN §7 asked for this from the start and it was never written, so a dozen screens went up
 * on a project whose story says grandparents are first-class users with nothing checking them.
 *
 * One test per page rather than one big one: a failure should name the page.
 */
async function check(path: string, session?: Session) {
  const { container, findByRole } = render(
    <TestDataProviders session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
  // Wait for the page to have arrived: auditing a loading skeleton proves nothing.
  await findByRole('heading', { level: 1 }, { timeout: 3000 }).catch(() => null)
  await expectNoAxeViolations(container)
}

const member = previewAccounts[0]
const admin = previewAccounts[1]

describe('the public pages', () => {
  for (const path of ['/', '/events', '/gallery', '/about', '/contact', '/privacy', '/login']) {
    it(`${path} has no automatic violations`, () => check(path))
  }
})

describe('the member portal', () => {
  for (const path of ['/portal', '/portal/household', '/portal/directory', '/portal/documents']) {
    it(`${path} has no automatic violations`, () => check(path, member))
  }
})

describe('the committee pages', () => {
  for (const path of ['/admin', '/admin/people', '/admin/events', '/admin/content', '/admin/media', '/admin/messages']) {
    it(`${path} has no automatic violations`, () => check(path, admin))
  }
})
