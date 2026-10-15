import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RowMenu } from './RowMenu'

describe('RowMenu', () => {
  it('hands focus back to its button before an item acts, so a dialog it opens returns there', async () => {
    const user = userEvent.setup()
    let focusedWhenChosen: Element | null = null
    render(<RowMenu about="The Sens" items={[{ label: 'Remove…', onSelect: () => (focusedWhenChosen = document.activeElement) }]} />)
    const trigger = screen.getByRole('button', { name: 'More for The Sens' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Remove…' }))
    expect(focusedWhenChosen).toBe(trigger)
    expect(screen.queryByRole('button', { name: 'Remove…' })).not.toBeInTheDocument()
  })

  it('closes when focus tabs out past the last item', async () => {
    const user = userEvent.setup()
    render(
      <>
        <RowMenu about="The Sens" items={[{ label: 'Email Rina', href: 'mailto:rina@example.com' }]} />
        <button type="button">Next row</button>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'More for The Sens' }))
    expect(screen.getByRole('link', { name: 'Email Rina' })).toBeInTheDocument()
    await user.tab()
    await user.tab()
    expect(screen.queryByRole('link', { name: 'Email Rina' })).not.toBeInTheDocument()
  })
})
