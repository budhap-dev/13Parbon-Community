import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Household, Viewer } from '@/domain/household'
import { HouseholdForm, type HouseholdDraft } from './HouseholdForm'

const household: Household = {
  id: 'hh-sen',
  name: 'The Sens',
  contactName: 'Rina Sen',
  email: 'rina@example.com',
  phone: '07700 900001',
  googleEmail: 'rina.sen@gmail.com',
  people: [
    { id: 'p1', name: 'Rina Sen', ageGroup: 'adult', note: 'Sings' },
    { id: 'p2', name: 'Mira Sen', ageGroup: 'child', age: 7 },
  ],
  interests: ['Cooking'],
  memberSince: '2024-04-01',
  membership: { status: 'active', paidTo: '2027-03-31' },
  role: 'member',
  listedInDirectory: true,
  shareEmail: true,
  sharePhone: false,
}

const member: Viewer = { householdId: 'hh-sen', role: 'member' }
const admin: Viewer = { householdId: 'hh-chatterjee', role: 'admin' }

// `adding` rather than passing undefined: a default parameter is used when the argument *is*
// undefined, so setup(admin, true) would quietly have edited the fixture instead.
function setup(viewer: Viewer, adding = false) {
  const onSave = vi.fn<(draft: HouseholdDraft) => void>()
  render(<HouseholdForm household={adding ? undefined : household} viewer={viewer} onSave={onSave} />)
  return { onSave }
}

describe('what each person is shown', () => {
  it('does not offer a member the committee\'s fields at all', () => {
    setup(member)
    expect(screen.queryByLabelText(/Google address/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Membership')).not.toBeInTheDocument()
    expect(screen.queryByText('Committee only')).not.toBeInTheDocument()
  })

  it('offers them to the committee', () => {
    setup(admin)
    expect(screen.getByLabelText(/Google address/)).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
    expect(screen.getByLabelText('Membership')).toBeInTheDocument()
  })

  it('still lets a member edit what is theirs', () => {
    setup(member)
    expect(screen.getByLabelText('Household name')).toHaveValue('The Sens')
    expect(screen.getByLabelText('Appear in the member directory')).toBeChecked()
    expect(screen.getByLabelText('Show our phone number')).not.toBeChecked()
  })
})

describe('the people in it', () => {
  it('shows everybody already in the household', () => {
    setup(member)
    // Rina is both the contact and a person in the household, so she appears twice.
    expect(screen.getAllByDisplayValue('Rina Sen')).toHaveLength(2)
    expect(screen.getByDisplayValue('Mira Sen')).toBeInTheDocument()
  })

  it('asks a child their age and does not ask an adult', () => {
    setup(member)
    // Two people, one child: exactly one age box.
    expect(screen.getAllByLabelText('Age')).toHaveLength(1)
  })

  it('adds and removes somebody', async () => {
    setup(member)
    await userEvent.click(screen.getByRole('button', { name: 'Add someone' }))
    expect(screen.getAllByLabelText('Name')).toHaveLength(3)

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[2])
    expect(screen.getAllByLabelText('Name')).toHaveLength(2)
  })

  it('will not offer to remove the only person left', async () => {
    setup(admin, true)
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('asks for an age once somebody becomes a child', async () => {
    setup(admin, true)
    await userEvent.selectOptions(screen.getByLabelText('Adult or child'), 'child')
    expect(screen.getByLabelText('Age')).toBeInTheDocument()
  })

  it('drops an age left behind when a child is changed back to an adult', async () => {
    const { onSave } = setup(admin)
    const group = screen.getAllByLabelText('Adult or child')[1]
    await userEvent.selectOptions(group, 'adult')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSave).toHaveBeenCalled()
    expect(onSave.mock.calls[0][0].people[1].age).toBeUndefined()
  })
})

describe('refusing to save something wrong', () => {
  it('does not save, and says what is missing', async () => {
    const { onSave } = setup(member)
    await userEvent.clear(screen.getByLabelText('Household name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/Give the household a name/)).toBeInTheDocument()
  })

  it('puts the cursor on the first thing that is wrong', async () => {
    setup(member)
    await userEvent.clear(screen.getByLabelText('Household name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByLabelText('Household name')).toHaveFocus()
  })

  it('ties the message to the field, so a screen reader reads them together', async () => {
    setup(member)
    const name = screen.getByLabelText('Household name')
    await userEvent.clear(name)
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(name).toHaveAttribute('aria-invalid', 'true')
    const describedBy = name.getAttribute('aria-describedby')!
    expect(document.getElementById(describedBy)).toHaveTextContent(/Give the household a name/)
  })

  it('points at the person who is wrong, not at the list', async () => {
    const { onSave } = setup(admin)
    await userEvent.clear(screen.getAllByLabelText('Name')[1])
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getAllByLabelText('Name')[1]).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByLabelText('Name')[0]).not.toHaveAttribute('aria-invalid')
  })

  it('refuses a household with nobody in it who is grown up', async () => {
    const { onSave } = setup(admin)
    await userEvent.selectOptions(screen.getAllByLabelText('Adult or child')[0], 'child')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/at least one adult/i)).toBeInTheDocument()
  })

  it('refuses a sign-in address that is not one, rather than locking somebody out quietly', async () => {
    const { onSave } = setup(admin)
    const google = screen.getByLabelText(/Google address/)
    await userEvent.clear(google)
    await userEvent.type(google, 'rina at gmail')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/Enter the Google address/)).toBeInTheDocument()
  })
})

describe('saving', () => {
  it('hands back what was typed, with the sign-in address lowercased', async () => {
    const { onSave } = setup(admin)
    const google = screen.getByLabelText(/Google address/)
    await userEvent.clear(google)
    await userEvent.type(google, '  Rina.Sen@GMAIL.com  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].googleEmail).toBe('rina.sen@gmail.com')
  })

  it('treats an emptied sign-in box as an invitation not taken up yet', async () => {
    const { onSave } = setup(admin)
    await userEvent.clear(screen.getByLabelText(/Google address/))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onSave.mock.calls[0][0].googleEmail).toBeNull()
  })

  it('carries the privacy choices back as they were left', async () => {
    const { onSave } = setup(member)
    await userEvent.click(screen.getByLabelText('Show our phone number'))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    const draft = onSave.mock.calls[0][0]
    expect(draft.sharePhone).toBe(true)
    expect(draft.listedInDirectory).toBe(true)
  })

  it('says "Add the household" when there is not one yet', () => {
    setup(admin, true)
    expect(screen.getByRole('button', { name: 'Add the household' })).toBeInTheDocument()
  })
})

describe('the privacy choices', () => {
  it('say plainly that they belong to the household and not the committee', () => {
    setup(member)
    const section = screen.getByRole('group', { name: 'What other members can see' })
    expect(within(section).getByText(/the household’s to make/)).toBeInTheDocument()
  })
})
