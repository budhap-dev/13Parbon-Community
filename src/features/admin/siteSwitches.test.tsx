import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

function renderAt(path: string, session = previewAccounts[1]) {
  render(
    <TestDataProviders session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
}

const switches = () => screen.findByRole('region', { name: 'What the site shows' })

describe('the switches', () => {
  it('says what each one does, so nobody turns the gallery off by accident', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    expect(within(panel).getByText(/pulls the whole gallery at once/)).toBeInTheDocument()
    expect(within(panel).getByText(/A page of placeholders reads worse than no page/)).toBeInTheDocument()
  })

  it('will not save until something has changed', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    expect(within(panel).getByRole('button', { name: 'Save the switches' })).toBeDisabled()

    await userEvent.click(within(panel).getByLabelText('News and newsletters'))
    expect(within(panel).getByRole('button', { name: 'Save the switches' })).toBeEnabled()
  })

  it('is honest that the home page audiences decide what is drawn, not what is sent', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    expect(within(panel).getByText(/it decides what is drawn, not what is sent/)).toBeInTheDocument()
  })
})

describe('what throwing a switch changes', () => {
  it('puts News into the navigation for everybody', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    // Off to begin with, which is why it is not in the header.
    expect(screen.queryByRole('link', { name: 'News' })).not.toBeInTheDocument()

    await userEvent.click(within(panel).getByLabelText('News and newsletters'))
    await userEvent.click(within(panel).getByRole('button', { name: 'Save the switches' }))

    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('Saved.'))
  })

  it('takes the gallery out of the public navigation', async () => {
    renderAt('/')
    // The navigation is built from the switches now, not from a list made when the file loaded.
    expect(await screen.findByRole('link', { name: 'Gallery' })).toBeInTheDocument()
  })

  it('is not offered to a member', async () => {
    renderAt('/admin/content', previewAccounts[0])
    await waitFor(() => expect(screen.queryByRole('region', { name: 'What the site shows' })).not.toBeInTheDocument())
  })
})
