import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { createMockApi } from '@/lib/api/mock'
import { TestDataProviders } from '@/test/render'

/**
 * The questions on the About page come from what the committee saved, not from about.ts.
 *
 * Until now they were the one part of that page still edited by pull request — and the one
 * most often wrong in a way that mattered, with "[N] weeks" sitting in a published answer.
 */
describe('the questions on the About page', () => {
  it('are whatever the committee last saved', async () => {
    const api = createMockApi()
    const settings = await api.settings.get()
    await api.settings.save(
      {
        ...settings,
        faq: [{ question: 'Is there parking?', answer: 'Yes, behind the hall, and it is free after six.' }],
      },
      { householdId: 'hh-chatterjee', role: 'admin' },
    )

    render(
      <TestDataProviders api={api}>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/about'] })} />
      </TestDataProviders>,
    )

    expect(await screen.findByText('Is there parking?')).toBeInTheDocument()
    expect(screen.getByText(/free after six/)).toBeInTheDocument()
    // And the file's questions are gone, which is the point: the file is a default, not a page.
    expect(screen.queryByText('Do I need to be Bengali?')).not.toBeInTheDocument()
  })

  it('show the file\'s questions when nobody has saved any', async () => {
    render(
      <TestDataProviders>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/about'] })} />
      </TestDataProviders>,
    )
    expect(await screen.findByText('Do I need to be Bengali?')).toBeInTheDocument()
  })
})
