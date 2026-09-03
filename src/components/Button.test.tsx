import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Button } from './Button'

describe('Button', () => {
  it('renders a real button by default and forwards clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Take a slot</Button>)
    const button = screen.getByRole('button', { name: 'Take a slot' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a router link when given a destination', () => {
    render(
      <MemoryRouter>
        <Button to="/join" variant="cream" size="sm">
          Join us
        </Button>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Join us' })
    expect(link).toHaveAttribute('href', '/join')
    expect(link.className).toContain('cream')
    expect(link.className).toContain('sm')
  })

  it('applies the variant and extra class names', () => {
    render(
      <Button variant="inkLine" className="extra">
        Volunteer
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Volunteer' })
    expect(button.className).toContain('inkLine')
    expect(button.className).toContain('extra')
  })
})
