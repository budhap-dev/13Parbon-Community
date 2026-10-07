import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { TestDataProviders } from '@/test/render'
import { expectNoAxeViolations } from '@/test/axe'

const admin = previewAccounts[1]

const LIST = `1. Which festival opens the Bengali year?
a) Durga Puja
b) Poila Boishakh
Answer: b

2. Colours are thrown at…
a) Holi
b) Diwali

3. Who is worshipped at Saraswati Puja?
a) Lakshmi
b) *Saraswati*`

async function openImport() {
  render(
    <TestDataProviders session={admin}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/play?tab=bank'] })} />
    </TestDataProviders>,
  )
  const bank = await screen.findByRole('heading', { name: 'Question bank' })
  const count = () => Number(within(bank.parentElement as HTMLElement).getByText(/\d+ questions/).textContent?.match(/\d+/)?.[0])
  // The count reads 0 while the bank is still loading.
  await waitFor(() => expect(count()).toBeGreaterThan(0))
  const before = count()
  await userEvent.click(screen.getByRole('button', { name: 'Import questions' }))
  // Pasted, not typed: a paste arrives all at once.
  const paste = (text: string) => fireEvent.change(screen.getByLabelText('Paste here'), { target: { value: text } })
  return { before, paste }
}

describe('importing questions into the bank', () => {
  it('shows what it read before saving anything, with the ones to fix and why', async () => {
    const { paste } = await openImport()
    paste(LIST)

    expect(screen.getByRole('heading', { name: 'Read as a list: 2 ready, 1 to fix' })).toBeInTheDocument()
    const notReady = screen.getByRole('list', { name: 'Not ready' })
    expect(notReady).toHaveTextContent('Line 6')
    expect(notReady).toHaveTextContent('Colours are thrown at…')
    expect(notReady).toHaveTextContent(/Say which answer is right/)
    expect(screen.getByRole('list', { name: 'Ready to import' })).toHaveTextContent('✓ Poila Boishakh')
  })

  it('saves the ready ones, tagged, and says so', async () => {
    const { before, paste } = await openImport()
    paste(LIST)
    await userEvent.type(screen.getByLabelText('Tag them all'), 'quiz-night')
    await userEvent.click(screen.getByRole('button', { name: 'Import 2 questions' }))

    expect(await screen.findByText('2 questions added to the bank. Put them in a quiz from the Quizzes tab.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(`${before + 2} questions`)).toBeInTheDocument())
    expect(screen.getByRole('row', { name: /Who is worshipped at Saraswati Puja/ })).toHaveTextContent('quiz-night')
  })

  it('can make a draft quiz from them in the same go', async () => {
    const { paste } = await openImport()
    paste(LIST)
    await userEvent.click(screen.getByLabelText(/Also make a quiz from them/))
    const importButton = screen.getByRole('button', { name: 'Import 2 questions' })
    // Not without a name for it.
    expect(importButton).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Name of the quiz'), 'Festival quiz')
    await userEvent.click(importButton)

    expect(await screen.findByText(/a draft quiz, “Festival quiz”, made from them/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Quizzes' }))
    const row = await screen.findByRole('row', { name: /Festival quiz/ })
    expect(row).toHaveTextContent('2 questions')
    expect(row).toHaveTextContent('Draft')
  })

  it('leaves out what is already in the bank, so the same paste can go in again', async () => {
    const { paste } = await openImport()
    paste(LIST)
    await userEvent.click(screen.getByRole('button', { name: 'Import 2 questions' }))
    await screen.findByText(/2 questions added/)

    await userEvent.click(screen.getByRole('button', { name: 'Import questions' }))
    paste(LIST)
    expect(screen.getByRole('heading', { name: 'Read as a list: 0 ready, 3 to fix' })).toBeInTheDocument()
    expect(screen.getAllByText('Already in the question bank.')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
  })

  it('reads cells pasted from a spreadsheet', async () => {
    const { paste } = await openImport()
    paste('Question\tA\tB\tCorrect\nWhat is a dhak?\tA drum\tA sweet\tA')
    expect(screen.getByRole('heading', { name: 'Read as a spreadsheet: 1 ready' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Ready to import' })).toHaveTextContent('✓ A drum')
  })

  it('says how to get a workbook in, rather than failing on it', async () => {
    await openImport()
    const file = new File(['PK'], 'questions.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    // Past the chooser's own filter, which somebody can switch to "All files".
    fireEvent.change(screen.getByLabelText('Choose a file'), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(/CSV UTF-8/)
  })

  it('reads a chosen CSV file', async () => {
    await openImport()
    const file = new File(['Question,A,B,Correct\nWhat is a dhak?,A drum,A sweet,A'], 'questions.csv', { type: 'text/csv' })
    await userEvent.upload(screen.getByLabelText('Choose a file'), file)
    expect(await screen.findByRole('heading', { name: 'Read as a spreadsheet: 1 ready' })).toBeInTheDocument()
  })

  it('passes the automated accessibility checks with a preview showing', async () => {
    const { paste } = await openImport()
    paste(LIST)
    await expectNoAxeViolations(document.body)
  })
})
