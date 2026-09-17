import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EXCERPT_MIN, PIECE_MIN } from '@/domain/news'
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
    await userEvent.type(
      screen.getByLabelText('The piece'),
      'The hall was full by seven, and the children went first as they always do. Nobody minded that it ran long, and there was food enough for everybody who came.',
    )
    await userEvent.type(screen.getByLabelText('Written by'), 'Debashis Chatterjee')
    await userEvent.click(screen.getByRole('button', { name: 'Write it' }))

    const row = await screen.findByRole('row', { name: /How the evening went/ })
    // Off by default: nothing reaches the website until somebody says so.
    expect(within(row).getByText('Draft')).toBeInTheDocument()
  })

  /*
   * A blank box and a button that says "Write something" is a fair question to be stuck on.
   * These are prompts rather than templates on purpose: nothing goes into a field, because a
   * form that fills itself in is how "[DATE]" ended up live in a piece nobody had finished.
   */
  it('offers something to write about, on a blank one', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))

    expect(screen.getByText('Not sure what to write?')).toBeInTheDocument()
    expect(screen.getByText(/Thank you to the people who cooked/)).toBeInTheDocument()
    // And where the other kind of thing goes, which is the question behind the question.
    expect(screen.getByText(/it is a notice rather than a/)).toBeInTheDocument()
    // Suggested, not typed in: the boxes are still empty.
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(screen.getByLabelText('The piece')).toHaveValue('')
  })

  it('does not offer them to somebody already editing a piece', async () => {
    await renderPage('Writing')
    const news = await screen.findByRole('region', { name: 'News' })
    const row = (await within(news).findAllByRole('row', { name: /Mahalaya programme/ }))[0]
    await userEvent.click(within(row).getByRole('button', { name: /^Edit / }))

    // They have decided what it is about; this would be read past every time.
    expect(screen.queryByText('Not sure what to write?')).not.toBeInTheDocument()
  })

  it('will not write one with nothing in it, and says what is missing', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))
    await userEvent.click(screen.getByRole('button', { name: 'Write it' }))

    expect(screen.getByText(/Give the piece a title/)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')

    /*
     * And each refusal says what the rule is. The counter under a box only appears once
     * somebody has started, so on the commonest refusal of all — a form somebody pressed the
     * button on too early — the message is the only thing that can carry the number.
     */
    expect(
      screen.getByText(`There is not much here yet — a piece runs to at least ${PIECE_MIN} characters.`),
    ).toBeInTheDocument()
    // Named in full: the piece and its one-line summary now share a floor, so "at least 30
    // characters" on its own matches both of them.
    expect(
      screen.getByText(
        `One line for the list page, so people know whether to open it — at least ${EXCERPT_MIN} characters.`,
      ),
    ).toBeInTheDocument()
  })

  /*
   * The rules were invisible until the form refused you. You wrote a piece, pressed Write it,
   * and were told the body was too thin — with no way of knowing how much more it wanted.
   */
  /*
   * The red line used to sit there until somebody pressed the button again — under a box that
   * was, by then, perfectly good. A form that goes on objecting to something you have already
   * put right reads as one that has stopped listening.
   */
  it('takes a refusal back as soon as it stops being true', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))
    await userEvent.click(screen.getByRole('button', { name: 'Write it' }))

    const complaint = `One line for the list page, so people know whether to open it — at least ${EXCERPT_MIN} characters.`
    expect(screen.getByText(complaint)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('One line for the list'), 'A line long enough to be worth reading.')
    expect(screen.queryByText(complaint)).not.toBeInTheDocument()
    // The ones still true stay: fixing one box does not clear the form.
    expect(screen.getByText(/a piece runs to at least/)).toBeInTheDocument()
  })

  it('does not object to a box somebody has not reached yet', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))

    await userEvent.type(screen.getByLabelText('Title'), 'How the evening went')
    // Nothing pressed yet, so nothing has been refused — the counters do the talking.
    expect(screen.queryByText(/a piece runs to at least/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Who wrote it/)).not.toBeInTheDocument()
  })

  it('says how much more a box needs, while it is still short', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))

    const piece = screen.getByLabelText('The piece')
    // Nothing on an untouched form: a page covered in what it will refuse, before anybody has
    // typed anything, reads as a telling-off.
    expect(screen.queryByText(/characters so far/)).not.toBeInTheDocument()

    await userEvent.type(piece, 'The hall was full by seven.')
    expect(screen.getByText(`27 of ${PIECE_MIN} characters so far.`)).toBeInTheDocument()
    // And the field carries it, for somebody who cannot see it sitting underneath.
    expect(piece.getAttribute('aria-describedby')).toContain('the-piece-need')

    await userEvent.paste('x'.repeat(PIECE_MIN))
    expect(screen.queryByText(/characters so far/)).not.toBeInTheDocument()
  })

  /*
   * Both tables have said `char_length(trim(title)) between 1 and 200` since they were written,
   * and nothing in the app knew it: a longer title was accepted, sent, and refused by a check
   * constraint, which reaches the screen as whatever Postgres called it — after the writing was
   * done. Added 2026-09-17.
   */
  it('counts a title down as the cap comes into sight, and says when it is past it', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))

    const title = screen.getByLabelText('Title')
    await userEvent.type(title, 'A short title')
    // Far from the wall: a running count here would be noise.
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument()

    await userEvent.clear(title)
    await userEvent.paste('x'.repeat(190))
    expect(screen.getByText('10 characters left of 200.')).toBeInTheDocument()

    // 190 and 15 more is 205, which is five past the wall.
    await userEvent.paste('y'.repeat(15))
    expect(screen.getByText('5 over the 200 allowed.')).toBeInTheDocument()
  })

  it('refuses a title too long for the column, rather than letting the database refuse it', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))

    await userEvent.type(screen.getByLabelText('Title'), 'A title')
    await userEvent.clear(screen.getByLabelText('Title'))
    await userEvent.paste('x'.repeat(201))
    await userEvent.type(screen.getByLabelText('One line for the list'), 'Long enough for the list page, and then some.')
    await userEvent.type(screen.getByLabelText('The piece'), 'x'.repeat(PIECE_MIN))
    await userEvent.type(screen.getByLabelText('Written by'), 'Someone')
    await userEvent.click(screen.getByRole('button', { name: 'Write it' }))

    expect(screen.getByText('A title has to fit in 200 characters.')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
  })

  it('says how the body is formatted, because that is all the formatting there is', async () => {
    await renderPage('Writing')
    await userEvent.click(await screen.findByRole('button', { name: 'Write something' }))
    expect(screen.getByText(/blank line between paragraphs/)).toBeInTheDocument()
  })

  /*
   * Until this existed a piece could be written and never removed — only unpublished, which
   * keeps it in the committee's own list for ever. Three pieces that arrived with the app
   * rather than from the committee are what made that a problem worth solving.
   */
  it('destroys a piece, once the dialog is answered', async () => {
    await renderPage('Writing')
    const news = await screen.findByRole('region', { name: 'News' })
    const rows = (await within(news).findAllByRole('row')).length
    const row = (await within(news).findAllByRole('row', { name: /Mahalaya programme/ }))[0]

    await userEvent.click(within(row).getByRole('button', { name: /^Delete / }))
    const asking = await screen.findByRole('dialog')
    // The gentler way is offered in the same breath, as the message screen does.
    expect(asking).toHaveTextContent(/On the website/)
    await userEvent.click(within(asking).getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(within(screen.getByRole('region', { name: 'News' })).getAllByRole('row')).toHaveLength(rows - 1),
    )
    expect(screen.queryAllByRole('row', { name: /Mahalaya programme/ })).toHaveLength(0)
  })

  it('keeps the piece when the dialog is backed out of', async () => {
    await renderPage('Writing')
    const news = await screen.findByRole('region', { name: 'News' })
    const rows = (await within(news).findAllByRole('row')).length
    const row = (await within(news).findAllByRole('row', { name: /Mahalaya programme/ }))[0]

    await userEvent.click(within(row).getByRole('button', { name: /^Delete / }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Keep it' }))

    expect(within(screen.getByRole('region', { name: 'News' })).getAllByRole('row')).toHaveLength(rows)
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

  /*
   * A notice is deleted outright, not unpublished — the contract says there is no version of one
   * worth keeping once it stops being true. It used to go on a single press, which made it the
   * one irreversible thing on this screen with nothing between it and a misplaced click.
   */
  it('asks in a dialog before taking a notice off, and can be backed out of', async () => {
    await renderPage('Noticeboard')
    const board = await screen.findByRole('region', { name: 'The noticeboard' })
    const rows = (await within(board).findAllByRole('row')).length

    await userEvent.click(within(board).getAllByRole('button', { name: /off the board$/ })[0])
    const asking = await screen.findByRole('dialog')
    expect(within(asking).getByText(/no version worth keeping/)).toBeInTheDocument()
    // Nothing has gone yet.
    expect(within(board).getAllByRole('row')).toHaveLength(rows)

    await userEvent.click(within(asking).getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(board).getAllByRole('row')).toHaveLength(rows)
  })

  it('takes a notice off the board once the dialog is answered', async () => {
    await renderPage('Noticeboard')
    const board = await screen.findByRole('region', { name: 'The noticeboard' })
    const rows = (await within(board).findAllByRole('row')).length

    await userEvent.click(within(board).getAllByRole('button', { name: /off the board$/ })[0])
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Take it off' }))

    await waitFor(() => expect(within(board).getAllByRole('row')).toHaveLength(rows - 1))
    expect(await screen.findByText(/Taken off the board/)).toBeInTheDocument()
  })

  it('answers Escape as Keep it, because the dialog is a question and not a step', async () => {
    await renderPage('Noticeboard')
    const board = await screen.findByRole('region', { name: 'The noticeboard' })
    const rows = (await within(board).findAllByRole('row')).length

    await userEvent.click(within(board).getAllByRole('button', { name: /off the board$/ })[0])
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(board).getAllByRole('row')).toHaveLength(rows)
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
