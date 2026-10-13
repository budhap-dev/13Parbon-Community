import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Answers yes to the question every remove now asks: the dialog's own confirm button, which is
 * its last. The question is checked for, so a remove that stopped asking fails here.
 */
export async function confirmRemove(): Promise<void> {
  const dialog = await screen.findByRole('dialog')
  const buttons = within(dialog).getAllByRole('button')
  await userEvent.click(buttons[buttons.length - 1])
}
