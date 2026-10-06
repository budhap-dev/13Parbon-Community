import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'
import { PortalLayout } from './PortalLayout'

function Broken(): never {
  throw new Error('a screen that cannot draw itself')
}

/*
 * A portal screen that throws used to take the whole portal with it, onto the router's bare
 * default page: no menu, no way back but the address bar. Now only the screen goes.
 */
describe('a portal screen that breaks', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('keeps the menu, says what happened, and clears once you move on', async () => {
    const router = createMemoryRouter(
      [
        {
          Component: PortalLayout,
          children: [
            { path: '/portal/broken', Component: Broken },
            { path: '/portal/help', element: <h1>Help</h1> },
          ],
        },
      ],
      { initialEntries: ['/portal/broken'] },
    )
    render(
      <TestDataProviders session={previewAccounts[0]}>
        <RouterProvider router={router} />
      </TestDataProviders>,
    )

    expect(await screen.findByRole('heading', { name: 'Something went wrong at our end' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Your household' })
    await userEvent.click(nav.querySelector('a[href="/portal/help"]')!)
    expect(await screen.findByRole('heading', { name: 'Help' })).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong at our end')).not.toBeInTheDocument()
  })
})
