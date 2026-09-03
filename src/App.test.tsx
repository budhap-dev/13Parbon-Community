import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the welcome screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /13Parbon Community/i })).toBeInTheDocument()
  })
})
