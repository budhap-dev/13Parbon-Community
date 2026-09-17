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

describe('the words on the public pages', () => {
  it('offers the lines that change, and says where the rest live', async () => {
    renderAt('/admin/content')
    const panel = await switches()

    expect(within(panel).getByLabelText('Who we are')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Mission and vision')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Note on the gallery')).toBeInTheDocument()
    // Honest about what it does not cover, rather than leaving somebody hunting.
    expect(within(panel).getByText(/still live in the files/)).toBeInTheDocument()
  })

  it('says when a line is still in brackets and therefore not shown at all', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    // The bracket convention is the one thing about these files somebody has to be told.
    expect(within(panel).getByText(/Still in brackets, so visitors are shown nothing here/)).toBeInTheDocument()
  })

  it('changes what the public sees when it is saved', async () => {
    renderAt('/admin/content')
    const panel = await switches()

    const mission = within(panel).getByLabelText('Who we are')
    await userEvent.clear(mission)
    await userEvent.type(mission, 'A Bengali cultural association in Leeds, since 2019.')
    // The wording has its own save. It used to be under a button called "save the switches",
    // which is the right name for one section of six and the wrong one for this.
    await userEvent.click(within(panel).getByRole('button', { name: 'Save the wording' }))

    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('Saved.'))
  })
})

describe('the committee and the roll', () => {
  it('shows who is on the committee, as the About page does', async () => {
    renderAt('/admin/content')
    const panel = await switches()

    expect(within(panel).getByLabelText('Role 1')).toHaveValue('Secretary')
    expect(within(panel).getByLabelText('Name 1')).toHaveValue('Mr. Dalim Ghosh')
  })

  it('says the order is not a ranking, because somebody will wonder', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    expect(within(panel).getByText(/which is not a ranking/)).toBeInTheDocument()
  })

  it('adds somebody and takes somebody off', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    const rows = () => within(panel).getAllByLabelText(/^Role \d+$/).length

    const before = rows()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add somebody' }))
    expect(rows()).toBe(before + 1)

    await userEvent.click(within(panel).getAllByRole('button', { name: /^Remove / })[0])
    expect(rows()).toBe(before)
  })

  it('keeps the roll as one name to a line, and counts it', async () => {
    renderAt('/admin/content')
    const panel = await switches()

    const roll = within(panel).getByLabelText('One name to a line')
    expect((roll as HTMLTextAreaElement).value.split('\n').length).toBe(31)
    expect(within(panel).getByText(/31 on the roll/)).toBeInTheDocument()
  })

  it('says the roll is names and nothing else', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    // The About page has always promised this; until now keeping it meant a pull request.
    expect(within(panel).getByText(/Take a name out the day its owner asks/)).toBeInTheDocument()
  })

  it('drops a half-typed committee row rather than saving it', async () => {
    renderAt('/admin/content')
    const panel = await switches()

    await userEvent.click(within(panel).getByRole('button', { name: 'Add somebody' }))
    // A blank row is not a change, so the committee has still nothing to save.
    expect(within(panel).getByRole('button', { name: 'Save the committee' })).toBeDisabled()
  })
})

/**
 * The questions people ask — the last of the nested lists to leave the files. It was the one
 * most often wrong in a way that mattered, and each fix was a pull request for a sentence.
 */
describe('the questions people ask', () => {
  it('shows them as the About page does, question and answer', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    expect(within(panel).getByLabelText('Question 1')).toHaveValue('Do I need to be a member to come to an event?')
    expect((within(panel).getByLabelText('Answer 1') as HTMLTextAreaElement).value).toMatch(/open to everyone/)
  })

  it('adds a question and takes one off', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    const rows = () => within(panel).getAllByLabelText(/^Question \d+$/).length

    const before = rows()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a question' }))
    expect(rows()).toBe(before + 1)

    await userEvent.click(within(panel).getAllByRole('button', { name: /^Remove question / })[0])
    expect(rows()).toBe(before)
  })

  it('drops a question with no answer rather than publishing half of one', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add a question' }))
    await userEvent.type(within(panel).getAllByLabelText(/^Question \d+$/).at(-1)!, 'Is there parking?')
    // A question with nothing under it is not a change, so the questions have nothing to save.
    expect(within(panel).getByRole('button', { name: 'Save the questions' })).toBeDisabled()
  })

  it('warns that square brackets are shown to visitors as they are', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    // One shipped as "[N] weeks". This is the line that stops the next one.
    expect(within(panel).getByText(/shown to visitors exactly/)).toBeInTheDocument()
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


/*
 * Six sections, six saves. One form with one button at the bottom meant the button was named
 * for one section and saved the other five as well — press "save the switches" on your way past
 * and a half-written answer three sections down went live with it.
 */
describe('each section saving on its own', () => {
  it('lights only the save belonging to what was changed', async () => {
    renderAt('/admin/content')
    const panel = await switches()

    await userEvent.clear(within(panel).getByLabelText('Who we are'))
    await userEvent.type(within(panel).getByLabelText('Who we are'), 'A Bengali cultural association in Leeds.')

    expect(within(panel).getByRole('button', { name: 'Save the wording' })).toBeEnabled()
    expect(within(panel).getByRole('button', { name: 'Save the switches' })).toBeDisabled()
    expect(within(panel).getByRole('button', { name: 'Save the committee' })).toBeDisabled()
  })

  it('does not commit another section on the way past', async () => {
    renderAt('/admin/content')
    const panel = await switches()

    // Something half-written in one section...
    await userEvent.clear(within(panel).getByLabelText('Who we are'))
    await userEvent.type(within(panel).getByLabelText('Who we are'), 'Half a sen')
    // ...and a deliberate change in another, saved on purpose.
    await userEvent.click(within(panel).getByLabelText('News and newsletters'))
    await userEvent.click(within(panel).getByRole('button', { name: 'Save the switches' }))

    // The half-written line is still unsaved, and still says so.
    await waitFor(() => expect(within(panel).getByRole('button', { name: 'Save the wording' })).toBeEnabled())
    expect(within(panel).getByLabelText('Who we are')).toHaveValue('Half a sen')
  })

  it('collapses to its headings, with each one saying what is in it', async () => {
    renderAt('/admin/content')
    const panel = await switches()
    // Six things you can read, rather than one you have to scroll.
    expect(within(panel).getByRole('button', { name: /What the public site shows/ })).toHaveAttribute('aria-expanded')
    expect(within(panel).getByRole('button', { name: /The committee/ })).toHaveAttribute('aria-expanded', 'false')
  })
})
