import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the home page inside the public layout', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('বারো মাসে 13 Parbon')
    // The section below the fold is loaded lazily. A second was enough on its own and not with
    // the whole suite running beside it, where this was the one test that failed now and then.
    expect(await screen.findByRole('region', { name: 'Our year' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
