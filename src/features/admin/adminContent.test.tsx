import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

const admin = previewAccounts[1]

function renderPage(tab?: 'Noticeboard' | 'Writing') {
  const router = createMemoryRouter(routes, { initialEntries: ['/admin/content'] })
  render(
    <TestDataProviders session={admin}>
      <RouterProvider router={router} />
    </TestDataProviders>,
  )
  // The page opens on the pages tab; the noticeboard and the writing each have their own.
  return tab ? openTab(tab).then(() => router) : Promise.resolve(router)
}

async function openTab(name: 'The pages' | 'Noticeboard' | 'Writing') {
  await userEvent.click(await screen.findByRole('tab', { name }))
}

describe('writing a piece', () => {
  it('writes one and leaves it as a draft', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))

    await userEvent.type(screen.getByLabelText('Title'), 'How the evening went')
    await userEvent.type(screen.getByLabelText('One line for the list'), 'Two hundred of us, and the hall only just held everybody.')
    await userEvent.type(screen.getByLabelText('The piece'), 'The hall was full by seven, and the children went first as they always do.')
    await userEvent.type(screen.getByLabelText('Written by'), 'Debashis Chatterjee')
    await userEvent.click(screen.getByRole('button', { name: 'Write it' }))

    const row = await screen.findByRole('row', { name: /How the evening went/ })
    // Off by default: nothing reaches the website until somebody says so.
    expect(within(row).getByText('Draft')).toBeInTheDocument()
  })

  it('will not write one with nothing in it, and says what is missing', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))
    await userEvent.click(screen.getByRole('button', { name: 'Write it' }))

    expect(screen.getByText(/Give the piece a title/)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
  })

  it('says how the body is formatted, because that is all the formatting there is', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))
    expect(screen.getByText(/blank line between paragraphs/)).toBeInTheDocument()
  })

  it('takes a published piece down, and says so in the list', async () => {
    await renderPage('Writing')
    const news = await screen.findByRole('region', { name: 'News' })
    // The region is static, so waiting for it proves nothing about the rows inside it.
    const row = (await within(news).findAllByRole('row', { name: /Mahalaya programme/ }))[0]
    await userEvent.click(within(row).getByRole('button', { name: /^Edit / }))

    await userEvent.click(screen.getByLabelText('On the website'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const after = screen.getByRole('region', { name: 'News' })
      expect(within(after).getAllByRole('row', { name: /Mahalaya programme/ })[0]).toHaveTextContent('Taken down')
    })
  })
})

describe('the noticeboard', () => {
  it('puts a notice up', async () => {
    await renderPage('Noticeboard')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Put up a notice' }))[0])

    await userEvent.type(screen.getByLabelText('Notice'), 'Doors open at six')
    await userEvent.type(screen.getByLabelText('What is happening'), 'The hall is open from six on Saturday.')
    await userEvent.click(screen.getByRole('button', { name: 'Put it up' }))

    expect(await screen.findByText('Doors open at six')).toBeInTheDocument()
  })

  /*
   * Cancel sits at the foot of the form, which is right for the button that abandons what you
   * typed — but on a long form it is below the fold, and it is not what somebody who opened the
   * form to look rather than to write is after. The browser's own Back leaves the screen
   * entirely, because the form is a state of this page rather than a page of its own.
   */
  it('lets somebody out of the form from the top, without saving or scrolling', async () => {
    await renderPage('Noticeboard')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Put up a notice' }))[0])
    expect(screen.getByLabelText('Notice')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back to the list' }))

    expect(screen.queryByLabelText('Notice')).not.toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'The noticeboard' })).toBeInTheDocument()
  })

  it('counts down, and says what a long one wants to be instead', async () => {
    await renderPage('Noticeboard')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Put up a notice' }))[0])

    const body = screen.getByLabelText('What is happening')
    await userEvent.type(body, 'x'.repeat(30))
    expect(screen.getByText(/470 characters left/)).toBeInTheDocument()
  })

  it('takes a notice off the board for good', async () => {
    await renderPage('Noticeboard')
    const board = await screen.findByRole('region', { name: 'The noticeboard' })
    const rows = (await within(board).findAllByRole('row')).length

    await userEvent.click(within(board).getAllByRole('button', { name: /off the board$/ })[0])

    await waitFor(() => expect(within(board).getAllByRole('row')).toHaveLength(rows - 1))
  })

  it('says why a notice goes and a piece does not', async () => {
    await renderPage('Noticeboard')
    const board = await screen.findByRole('region', { name: 'The noticeboard' })
    expect(within(board).getByText(/no version of it worth keeping/)).toBeInTheDocument()
  })
})

/*
 * Three jobs on one screen, and opening any form used to replace the lot. Putting a notice up
 * then returned you to the top of everything — the site's wording, the switches, the albums —
 * with no word of what had happened and nothing to say where the notice had gone.
 */
describe('the three tabs', () => {
  it('opens on the pages, with the other two a click away', async () => {
    renderPage()
    expect(await screen.findByRole('tab', { name: 'The pages', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Noticeboard', selected: false })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Writing', selected: false })).toBeInTheDocument()
  })

  it('shows one tab at a time', async () => {
    await renderPage('Noticeboard')
    expect(await screen.findByRole('region', { name: 'The noticeboard' })).toBeInTheDocument()
    // The pages and the writing are not merely scrolled past: they are not there.
    expect(screen.queryByRole('region', { name: 'News' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Pages' })).not.toBeInTheDocument()
  })

  /*
   * The point of the split. Saving used to drop you back at the top of a page carrying five
   * other things, and you had to find your way to the noticeboard again to see what you had
   * done — which is how an afternoon went on a notice that was in the database all along.
   */
  it('leaves you on the noticeboard after putting one up, and says what happened', async () => {
    await renderPage('Noticeboard')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Put up a notice' }))[0])

    await userEvent.type(screen.getByLabelText('Notice'), 'Doors open at six')
    await userEvent.type(screen.getByLabelText('What is happening'), 'The hall is open from six on Saturday.')
    await userEvent.click(screen.getByRole('button', { name: 'Put it up' }))

    expect(await screen.findByRole('tab', { name: 'Noticeboard', selected: true })).toBeInTheDocument()
    expect(await screen.findByText(/Up now, on the website/)).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'The noticeboard' })).toBeInTheDocument()
  })

  it('keeps the tab in the address, so a reload does not lose your place', async () => {
    const router = await renderPage('Writing')
    await waitFor(() => expect(router.state.location.search).toContain('tab=writing'))
  })
})
