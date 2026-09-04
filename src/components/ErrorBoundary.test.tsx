import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ErrorBoundary } from './ErrorBoundary'

function Throws(): never {
  throw new Error('the component gave up')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error itself; the test does not need it in the output.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows the page through when nothing throws', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <p>The page as normal</p>
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('The page as normal')).toBeInTheDocument()
  })

  it('keeps a page on screen when a component throws, rather than a blank one', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Throws />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Something went wrong at our end' })).toBeInTheDocument()
    // Something to press, and a way back: a dead end is the thing being fixed here.
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/')
  })

  it('reports the failure for whoever is looking at the console', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Throws />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(console.error).toHaveBeenCalledWith(
      'Something threw while rendering:',
      expect.objectContaining({ message: 'the component gave up' }),
      expect.any(String),
    )
  })
})
