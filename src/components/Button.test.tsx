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

  it('renders a plain anchor for an address the router should not handle', () => {
    render(<Button href="mailto:rina@example.com">Reply by email</Button>)
    expect(screen.getByRole('link', { name: 'Reply by email' })).toHaveAttribute('href', 'mailto:rina@example.com')
  })

  it('opens an address on another site in a new tab, but not a mailto', () => {
    const { unmount } = render(<Button href="https://example.com/plan">Open the planner</Button>)
    const external = screen.getByRole('link', { name: 'Open the planner' })
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noreferrer')
    unmount()
    render(<Button href="mailto:a@example.com">Email</Button>)
    expect(screen.getByRole('link', { name: 'Email' })).not.toHaveAttribute('target')
  })
})
