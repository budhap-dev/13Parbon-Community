import { render, screen } from '@testing-library/react'
import { Welcome } from './Welcome'

describe('Welcome', () => {
  it('renders the app name as the heading', () => {
    render(<Welcome appName="13Parbon Community" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('13Parbon Community')
  })

  it('shows the community tagline', () => {
    render(<Welcome appName="Test" />)
    expect(screen.getByText(/twelve months, thirteen festivals/i)).toBeInTheDocument()
  })
})
