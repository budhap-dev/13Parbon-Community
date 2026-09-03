import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { TestDataProviders } from '@/test/render'
import { routes } from './router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <TestDataProviders>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  return router
}

describe('routes', () => {
  it('serves the home page at the root', async () => {
    renderAt('/')
    expect(await screen.findByRole('region', { name: 'Moments from our year' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
  })

  it('serves the member sign-in page', async () => {
    renderAt('/login')
    expect(await screen.findByRole('heading', { level: 1, name: 'Member sign-in' })).toBeInTheDocument()
    expect(document.title).toBe('Member sign-in · 13Parbon Community')
  })

  it('no longer has a join page, since membership is by invitation', async () => {
    renderAt('/join')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows not found for unknown paths', async () => {
    renderAt('/nowhere')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('moves focus to the main content after navigating', async () => {
    renderAt('/')
    await screen.findByRole('region', { name: 'Moments from our year' })
    await userEvent.click(screen.getByRole('link', { name: 'Events' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'What’s on' })).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('main'))
  })
})
