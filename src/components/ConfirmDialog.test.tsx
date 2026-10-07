import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

/** A trigger and the question it raises, which is the only way this is ever used. */
function Harness({ onConfirm, busy }: { onConfirm?: () => void; busy?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Take off
      </button>
      <ConfirmDialog
        open={open}
        title="Take this notice off the board?"
        confirmLabel="Take it off"
        busyLabel="Removing…"
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          onConfirm?.()
          setOpen(false)
        }}
      >
        It goes for good.
      </ConfirmDialog>
    </>
  )
}

describe('asking before something is destroyed', () => {
  it('is not in the page until it is asked for', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('names itself and says what will happen', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Take off' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Take this notice off the board?')
    expect(dialog).toHaveAccessibleDescription('It goes for good.')
  })

  it('opens with the focus on Keep it, not on the destructive answer', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Take off' }))
    expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus()
  })

  it('gives the focus back to whatever raised it', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Take off' })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    // Otherwise a screen reader is dropped at the top of the page with no word of what happened.
    expect(trigger).toHaveFocus()
  })

  it('takes Escape as no', async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Take off' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('takes a click on the backdrop as no', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Take off' }))
    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement
    await userEvent.click(backdrop)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not take a click that began inside the panel as a click outside it', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Take off' }))
    // Selecting the sentence and releasing past the edge of the panel is somebody reading, not
    // somebody dismissing.
    await userEvent.click(within(screen.getByRole('dialog')).getByText('It goes for good.'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('keeps Tab inside the question', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Take off' }))

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Take it off' })).toHaveFocus()
    await userEvent.tab()
    // Round to the start rather than out to the page behind, which is not answering anything.
    expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus()
  })

  it('only destroys when the destructive answer is the one clicked', async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Take off' }))
    await userEvent.click(screen.getByRole('button', { name: 'Take it off' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('says it is working, and takes no second answer while it is', async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} busy />)
    await userEvent.click(screen.getByRole('button', { name: 'Take off' }))

    expect(screen.getByRole('button', { name: 'Removing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    // Still there: the write is in flight, and half-answering it would leave the screen lying.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
