import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmButton } from './ConfirmButton'

describe('ConfirmButton', () => {
  it('is red, asks first, and does nothing when told to keep it', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmButton title="Remove the Treasurer?" body="Gone when you save." onConfirm={onConfirm}>
        Remove
      </ConfirmButton>,
    )
    const button = screen.getByRole('button', { name: 'Remove' })
    expect(button.className).toMatch(/danger/)
    await userEvent.click(button)
    expect(screen.getByRole('dialog', { name: 'Remove the Treasurer?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('removes once the question is answered yes', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmButton title="Remove the Treasurer?" body="Gone when you save." confirmLabel="Remove them" onConfirm={onConfirm}>
        Remove
      </ConfirmButton>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove them' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
