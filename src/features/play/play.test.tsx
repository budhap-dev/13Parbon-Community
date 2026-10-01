import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { defaultSettings } from '@/app/defaults'
import { createMockApi, withAuditTrail, type ApiClient } from '@/lib/api'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import type { Session } from '@/lib/auth/session'
import { TEST_NOW, TestDataProviders, createFailingApi } from '@/test/render'

const member: Session = previewAccounts[0]
const admin: Session = previewAccounts[1]

function api(over: Partial<ApiClient> = {}, settings: Partial<typeof defaultSettings> = {}): ApiClient {
  const base = withAuditTrail(createMockApi({ now: () => TEST_NOW }), () => TEST_NOW)
  return {
    ...base,
    settings: { ...base.settings, get: async () => ({ ...defaultSettings, ...settings }) },
    ...over,
  }
}

function renderAt(path: string, session?: Session, client: ApiClient = api()) {
  render(
    <TestDataProviders api={client} session={session}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </TestDataProviders>,
  )
  return client
}

describe('polls and quizzes, for a member', () => {
  it('is in the sidebar', async () => {
    renderAt('/portal', member)
    const nav = await screen.findByRole('navigation', { name: 'Your household' })
    expect(within(nav).getByRole('link', { name: /Polls and quizzes/ })).toHaveAttribute('href', '/portal/play')
  })

  it('asks for a vote, then shows the totals with their choice marked', async () => {
    renderAt('/portal/play', member)
    await screen.findByRole('heading', { level: 1, name: 'Polls and quizzes' })
    const poll = (await screen.findByRole('heading', { name: /autumn picnic/ })).closest('section')!
    const vote = within(poll).getByRole('button', { name: 'Vote' })
    expect(vote).toBeDisabled()
    await userEvent.click(within(poll).getByLabelText(/Sunday 25 October/))
    await userEvent.click(vote)
    expect(await within(poll).findByText(/Sunday 25 October — your choice/)).toBeInTheDocument()
    expect(within(poll).getByText(/60% · 3 votes/)).toBeInTheDocument()
  })

  it('lets a household change its mind while the poll is open', async () => {
    renderAt('/portal/play', member)
    const poll = (await screen.findByRole('heading', { name: /autumn picnic/ })).closest('section')!
    await userEvent.click(within(poll).getByLabelText(/Sunday 18 October/))
    await userEvent.click(within(poll).getByRole('button', { name: 'Vote' }))
    await userEvent.click(await within(poll).findByRole('button', { name: 'Change our vote' }))
    await userEvent.click(within(poll).getByRole('button', { name: 'Keep it as it was' }))
    await userEvent.click(await within(poll).findByRole('button', { name: 'Change our vote' }))
    await userEvent.click(within(poll).getByLabelText(/Sunday 1 November/))
    await userEvent.click(within(poll).getByRole('button', { name: 'Change our vote' }))
    expect(await within(poll).findByText(/Sunday 1 November — your choice/)).toBeInTheDocument()
  })

  it('says when the totals will show, and that a named poll is named', async () => {
    renderAt('/portal/play', member)
    const bhog = (await screen.findByRole('heading', { name: /Saraswati Puja lunch/ })).closest('section')!
    expect(within(bhog).getByText(/totals show when it closes on/)).toBeInTheDocument()
    await userEvent.click(within(bhog).getByLabelText(/Khichuri/))
    await userEvent.click(within(bhog).getByRole('button', { name: 'Vote' }))
    expect(await within(bhog).findByText(/Your household chose/)).toBeInTheDocument()

    const setup = screen.getByRole('heading', { name: /help set up the hall/ }).closest('section')!
    expect(within(setup).getByText(/A named poll/)).toBeInTheDocument()
    expect(within(setup).getByText(/Only the committee sees the totals/)).toBeInTheDocument()
  })

  it('keeps closed polls folded away, with their totals', async () => {
    renderAt('/portal/play', member)
    const fold = await screen.findByText(/Closed polls \(1\)/)
    await userEvent.click(fold)
    const old = screen.getByRole('heading', { name: /4pm a good start time/ }).closest('section')!
    expect(within(old).getByText(/Yes — your choice/)).toBeInTheDocument()
  })

  it('plays a quiz a question at a time, then marks it and shows the board', async () => {
    renderAt('/portal/play/quiz-words', member)
    await screen.findByRole('heading', { level: 1, name: 'Bengali words for children' })
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /Sweet/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Next question' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('button', { name: /Sweet/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Next question' }))
    await userEvent.click(screen.getByRole('button', { name: /Home/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Next question' }))
    await userEvent.click(screen.getByRole('button', { name: /Fire/ }))
    // The leaderboard question, asked as they finish.
    const optOut = screen.getByRole('checkbox', { name: /Show our household on the leaderboard/ })
    expect(optOut).toBeChecked()
    await userEvent.click(optOut)
    await userEvent.click(screen.getByRole('button', { name: 'Finish and see the answers' }))

    expect(await screen.findByText('Your household’s score')).toBeInTheDocument()
    expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0)
    // Two right, and the one they missed shows both their answer and the right one.
    expect(screen.getAllByText('Right — your answer')).toHaveLength(2)
    expect(screen.getByText('The right answer')).toBeInTheDocument()
    expect(screen.getByText('Your answer')).toBeInTheDocument()
    const board = screen.getByRole('heading', { name: 'Leaderboard' }).closest('section')!
    expect(await within(board).findByText('The Ghoshes')).toBeInTheDocument()
    expect(within(board).queryByText('The Sens')).not.toBeInTheDocument()
  })

  it('shows the score instead of a second go', async () => {
    const client = api()
    await client.quizzes.submit('quiz-words', [0, 1, 1], true, { householdId: 'hh-sen', role: 'member' })
    renderAt('/portal/play/quiz-words', member, client)
    expect(await screen.findByText(/One go per household, and yours has been played/)).toBeInTheDocument()
    expect(screen.getAllByText('3 / 3').length).toBeGreaterThan(0)
    const board = screen.getByRole('heading', { name: 'Leaderboard' }).closest('section')!
    expect(await within(board).findByText('The Sens')).toBeInTheDocument()
  })

  it('lists the quizzes with a score once played', async () => {
    const client = api()
    await client.quizzes.submit('quiz-words', [0, 1, 1], true, { householdId: 'hh-sen', role: 'member' })
    renderAt('/portal/play', member, client)
    expect(await screen.findByRole('link', { name: 'Scored 3 / 3' })).toHaveAttribute('href', '/portal/play/quiz-words')
    expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute('href', '/portal/play/quiz-pujo')
  })

  it('sends a suggestion and shows it waiting', async () => {
    renderAt('/portal/play', member)
    await userEvent.click(await screen.findByRole('button', { name: 'Suggest a question or poll' }))
    await userEvent.type(screen.getByLabelText('The question'), 'Which sweet is Bardhaman famous for?')
    await userEvent.type(screen.getByLabelText('Answer 1'), 'Sitabhog')
    await userEvent.type(screen.getByLabelText('Answer 2'), 'Rasgulla')
    await userEvent.click(screen.getByRole('button', { name: 'Add an answer' }))
    await userEvent.type(screen.getByLabelText('Answer 3'), 'Mishti doi')
    await userEvent.click(screen.getByRole('button', { name: 'Remove answer 3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send to the committee' }))
    expect(await screen.findByText(/it is with the committee/)).toBeInTheDocument()
    expect(screen.getByText('Which sweet is Bardhaman famous for?')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for the committee/)).toBeInTheDocument()
  })

  it('refuses a suggestion that is not finished, and can switch to a poll', async () => {
    renderAt('/portal/play', member)
    await userEvent.click(await screen.findByRole('button', { name: 'Suggest a question or poll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send to the committee' }))
    expect(await screen.findByText('Write the question.')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('What are you suggesting?'), 'poll')
    expect(screen.getByLabelText('What to ask')).toBeInTheDocument()
    expect(screen.getByLabelText('Choice 1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Suggest a question or poll' })).toBeInTheDocument()
  })

  it('offers what is open on the dashboard, and nothing once it is done', async () => {
    renderAt('/portal', member)
    const say = (await screen.findByText('Have your say')).closest('section')!
    expect(within(say).getByRole('link', { name: 'Vote' })).toHaveAttribute('href', '/portal/play')
  })

  it('offers a quiz on the dashboard once every poll is answered', async () => {
    const client = api()
    const sen = { householdId: 'hh-sen', role: 'member' as const }
    for (const id of ['poll-picnic', 'poll-setup', 'poll-bhog']) await client.polls.vote(id, 0, sen)
    renderAt('/portal', member, client)
    const say = (await screen.findByText('Have your say')).closest('section')!
    expect(within(say).getByRole('link', { name: 'Play' })).toHaveAttribute('href', expect.stringMatching(/^\/portal\/play\/quiz-/))
  })

  it('says so when the polls and quizzes do not arrive', async () => {
    const failing = createFailingApi()
    renderAt('/portal/play', member, api({ polls: failing.polls, quizzes: failing.quizzes }))
    expect(await screen.findByText(/could not load the polls/)).toBeInTheDocument()
    expect(screen.getByText(/could not load the quizzes/)).toBeInTheDocument()
  })
})

describe('quizzes on the public website', () => {
  it('are not there while the switch is off', async () => {
    renderAt('/quizzes')
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Quizzes' })).not.toBeInTheDocument())
  })

  it('list the public quizzes only, and play one without signing in', async () => {
    renderAt('/quizzes', undefined, api({}, { showQuizzes: true, showMemberSignIn: true }))
    await screen.findByRole('heading', { level: 1, name: 'Quizzes' })
    expect(await screen.findByRole('heading', { name: /Durga Puja: how well/ })).toBeInTheDocument()
    expect(screen.queryByText('Bengali words for children')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Play' }))

    await screen.findByRole('heading', { level: 1, name: /Durga Puja: how well/ })
    for (const answer of [/Dashami/, /Pitri Paksha/, /Dhak/, /Saraswati/]) {
      await userEvent.click(screen.getByRole('button', { name: answer }))
      const next = screen.queryByRole('button', { name: 'Next question' })
      if (next) await userEvent.click(next)
    }
    // No leaderboard question for somebody who is nobody to the site.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Finish and see the answers' }))
    expect(await screen.findByText('Full marks!')).toBeInTheDocument()
    expect(screen.getByText(/Your score/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Leaderboard' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'sign in' })).toHaveAttribute('href', '/login')
  })

  it('say so when a quiz is not theirs to play', async () => {
    renderAt('/quizzes/quiz-words', undefined, api({}, { showQuizzes: true }))
    expect(await screen.findByText(/This quiz is not here/)).toBeInTheDocument()
  })

  it('say so when there is none', async () => {
    renderAt('/quizzes', undefined, api({ quizzes: { ...createMockApi().quizzes, list: async () => [] } }, { showQuizzes: true }))
    expect(await screen.findByText(/No quizzes just now/)).toBeInTheDocument()
  })

  it('say so when the list does not arrive', async () => {
    renderAt('/quizzes', undefined, api({ quizzes: createFailingApi().quizzes }, { showQuizzes: true }))
    expect(await screen.findByText(/could not load the quizzes/)).toBeInTheDocument()
  })
})

describe('the committee’s polls and quizzes', () => {
  it('is not a door a member can walk into', async () => {
    renderAt('/admin/play', member)
    await screen.findByRole('navigation', { name: 'Your household' })
    expect(screen.queryByRole('tab', { name: 'Question bank' })).not.toBeInTheDocument()
  })

  it('shows the totals, and names only on a named poll', async () => {
    renderAt('/admin/play', admin)
    await screen.findByRole('tab', { name: 'Polls', selected: true })
    const picnic = (await screen.findByRole('heading', { name: /autumn picnic/ })).closest('section')!
    expect(within(picnic).getByText(/4 votes/)).toBeInTheDocument()
    expect(within(picnic).queryByText(/The Ghoshes/)).not.toBeInTheDocument()
    const setup = screen.getByRole('heading', { name: /help set up the hall/ }).closest('section')!
    expect(within(setup).getByText(/Yes, count us in: The Banerjees, The Ghoshes/)).toBeInTheDocument()
  })

  it('makes a poll as a draft, opens it, closes it and deletes it', async () => {
    renderAt('/admin/play', admin)
    await userEvent.click(await screen.findByRole('button', { name: 'New poll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Make the poll' }))
    expect(await screen.findByText('Ask the question in a few words.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('The question'), 'Tea or coffee at the interval?')
    await userEvent.type(screen.getByLabelText('Choice 1'), 'Tea')
    await userEvent.type(screen.getByLabelText('Choice 2'), 'Coffee')
    await userEvent.click(screen.getByRole('button', { name: 'Make the poll' }))
    expect(await screen.findByText(/Saved as a draft/)).toBeInTheDocument()

    const made = (await screen.findByRole('heading', { name: 'Tea or coffee at the interval?' })).closest('section')!
    expect(within(made).getByText('Draft')).toBeInTheDocument()
    await userEvent.click(within(made).getByRole('button', { name: 'Open it now' }))
    expect(await within(made).findByText('Open')).toBeInTheDocument()

    // Closing one that has been open a while; the clock here stands still, so the poll just
    // opened would close at the very moment it opened.
    const picnic = screen.getByRole('heading', { name: /autumn picnic/ }).closest('section')!
    await userEvent.click(within(picnic).getByRole('button', { name: 'Close it now' }))
    expect(await within(picnic).findByText('Closed')).toBeInTheDocument()

    await userEvent.click(within(made).getByRole('button', { name: /Delete/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Tea or coffee at the interval?' })).not.toBeInTheDocument())
  })

  it('locks the choices of a poll people have voted in', async () => {
    renderAt('/admin/play', admin)
    const picnic = (await screen.findByRole('heading', { name: /autumn picnic/ })).closest('section')!
    await userEvent.click(within(picnic).getByRole('button', { name: 'Edit' }))
    expect(await screen.findByText(/People have already voted/)).toBeInTheDocument()
    expect(screen.getByLabelText('Choice 1')).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Named/ })).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Members see the totals'), 'after_close')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved.')).toBeInTheDocument()
  })

  it('writes a question for the bank', async () => {
    renderAt('/admin/play?tab=bank', admin)
    await screen.findByRole('tab', { name: 'Question bank', selected: true })
    expect(await screen.findByText('Which goddess rides a swan?')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filter by tag'), 'words')
    expect(screen.queryByText('Which goddess rides a swan?')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'New question' }))
    await userEvent.type(screen.getByLabelText('Question'), 'What colour is a lal-paar sari’s border?')
    await userEvent.type(screen.getByLabelText('Answer 1'), 'Red')
    await userEvent.type(screen.getByLabelText('Answer 2'), 'Blue')
    await userEvent.click(screen.getByRole('radio', { name: 'Answer 1 is the right one' }))
    await userEvent.type(screen.getByLabelText('Tags'), 'poila-boishakh')
    await userEvent.click(screen.getByRole('button', { name: 'Add to the bank' }))
    expect(await screen.findByText(/Added to the bank/)).toBeInTheDocument()
  })

  it('locks a played question’s wording', async () => {
    renderAt('/admin/play?tab=bank', admin)
    const row = (await screen.findByText('“Mishti” means…')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }))
    expect(await screen.findByText(/Somebody has answered this in a quiz/)).toBeInTheDocument()
    expect(screen.getByLabelText('Question')).toBeDisabled()
  })

  it('builds a quiz from the bank, in order', async () => {
    renderAt('/admin/play?tab=quizzes', admin)
    await userEvent.click(await screen.findByRole('button', { name: 'New quiz' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Saraswati Puja')
    const add = screen.getByLabelText('Add a question')
    await userEvent.selectOptions(add, 'q-swan')
    await userEvent.selectOptions(screen.getByLabelText('Add a question'), 'q-boishakh')
    await userEvent.click(screen.getByRole('button', { name: 'Move question 2 up' }))
    expect(screen.getByText(/1\. Poila Boishakh is the first day/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Move question 1 down' }))
    await userEvent.click(screen.getByRole('button', { name: 'Take question 2 out' }))
    await userEvent.selectOptions(screen.getByLabelText('Who can play'), 'public')
    expect(screen.getByText(/once Quizzes is switched on/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Make the quiz' }))
    expect(await screen.findByText(/Saved as a draft/)).toBeInTheDocument()
    expect(await screen.findByText('Saraswati Puja')).toBeInTheDocument()
  })

  it('offers a copy of a quiz people have played, and shows its scores', async () => {
    renderAt('/admin/play?tab=quizzes', admin)
    expect(await screen.findByText(/switched off on the public website/)).toBeInTheDocument()
    const row = (await screen.findByText('Bengali words for children')).closest('tr')!
    expect(within(row).getByText('3 households')).toBeInTheDocument()
    await userEvent.click(within(row).getByRole('button', { name: 'Scores' }))
    const scores = (await screen.findByRole('heading', { name: /Scores: Bengali words/ })).closest('section')!
    expect(await within(scores).findByText('The Roys')).toBeInTheDocument()
    expect(within(scores).getAllByText('As “a household”')).toHaveLength(1)

    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }))
    expect(await screen.findByText(/People have already played this quiz/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Make a copy' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Bengali words for children (copy)')
    await userEvent.click(screen.getByRole('button', { name: 'Make the quiz' }))
    expect(await screen.findByText(/Saved as a draft/)).toBeInTheDocument()
  })

  it('turns a suggested question into a bank question, credited, and marks it used', async () => {
    const client = renderAt('/admin/play?tab=suggestions', admin)
    expect(await screen.findByRole('tab', { name: 'Suggestions (2)' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: /Which river runs past Kumartuli/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to the question bank' }))
    expect(await screen.findByLabelText('Question')).toHaveValue('Which river runs past Kumartuli, where the idols are made?')
    expect(screen.getByLabelText('Credit')).toHaveValue('The Ghoshes')
    await userEvent.click(screen.getByRole('button', { name: 'Add to the bank' }))
    expect(await screen.findByText(/Added to the bank/)).toBeInTheDocument()
    await waitFor(async () => {
      const all = await client.suggestions.listAll({ householdId: 'hh-chatterjee', role: 'admin' })
      expect(all.find((s) => s.id === 'sg-1')?.status).toBe('approved')
    })
  })

  it('turns a suggested poll into a poll form', async () => {
    renderAt('/admin/play?tab=suggestions', admin)
    await userEvent.click(await screen.findByRole('button', { name: /monthly adda/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Make it a poll' }))
    expect(await screen.findByLabelText('The question')).toHaveValue('Would you come to a monthly adda on a Friday evening?')
    await userEvent.click(screen.getByRole('button', { name: 'Make the poll' }))
    expect(await screen.findByText(/Saved as a draft/)).toBeInTheDocument()
  })

  it('declines a suggestion, puts it back, and deletes it', async () => {
    renderAt('/admin/play?tab=suggestions', admin)
    await userEvent.click(await screen.findByRole('button', { name: /monthly adda/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Not this time' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Put back in the queue' }))
    expect(await screen.findByRole('button', { name: 'Not this time' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /monthly adda/ })).not.toBeInTheDocument())
  })

  it('refuses to delete a question that is in a quiz, and says why', async () => {
    renderAt('/admin/play?tab=bank', admin)
    const row = (await screen.findByText('Which goddess rides a swan?')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: /Delete/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Take it out of the quiz first/)
  })

  it('has a badge for what is waiting', async () => {
    renderAt('/admin', admin)
    const nav = await screen.findByRole('navigation', { name: 'Committee' })
    const link = await within(nav).findByRole('link', { name: /Polls and quizzes/ })
    await waitFor(() => expect(link).toHaveTextContent('2'))
  })
})
