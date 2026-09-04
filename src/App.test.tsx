import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the home page inside the public layout', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('বারো মাসে 13 Parbon')
    expect(await screen.findByRole('region', { name: 'Our year' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
