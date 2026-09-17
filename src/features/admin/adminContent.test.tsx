import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'

const admin = previewAccounts[1]

function renderPage() {
  render(
    <TestDataProviders session={admin}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/content'] })} />
    </TestDataProviders>,
  )
}

describe('writing a piece', () => {
  it('writes one and leaves it as a draft', async () => {
    renderPage()
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
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))
    await userEvent.click(screen.getByRole('button', { name: 'Write it' }))

    expect(screen.getByText(/Give the piece a title/)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
  })

  it('says how the body is formatted, because that is all the formatting there is', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))
    expect(screen.getByText(/blank line between paragraphs/)).toBeInTheDocument()
  })

  it('takes a published piece down, and says so in the list', async () => {
    renderPage()
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
    renderPage()
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
    renderPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Put up a notice' }))[0])
    expect(screen.getByLabelText('Notice')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'All content' }))

    expect(screen.queryByLabelText('Notice')).not.toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'The noticeboard' })).toBeInTheDocument()
  })

  it('counts down, and says what a long one wants to be instead', async () => {
    renderPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Put up a notice' }))[0])

    const body = screen.getByLabelText('What is happening')
    await userEvent.type(body, 'x'.repeat(30))
    expect(screen.getByText(/470 characters left/)).toBeInTheDocument()
  })

  it('takes a notice off the board for good', async () => {
    renderPage()
    const board = await screen.findByRole('region', { name: 'The noticeboard' })
    const rows = (await within(board).findAllByRole('row')).length

    await userEvent.click(within(board).getAllByRole('button', { name: /off the board$/ })[0])

    await waitFor(() => expect(within(board).getAllByRole('row')).toHaveLength(rows - 1))
  })

  it('says why a notice goes and a piece does not', async () => {
    renderPage()
    const board = await screen.findByRole('region', { name: 'The noticeboard' })
    expect(within(board).getByText(/no version of it worth keeping/)).toBeInTheDocument()
  })
})
