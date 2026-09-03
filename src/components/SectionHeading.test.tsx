import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { SectionHeading } from './SectionHeading'

describe('SectionHeading', () => {
  it('renders a level-2 heading with an optional action link', () => {
    render(
      <MemoryRouter>
        <SectionHeading title="Coming up" action={{ label: 'Full calendar', to: '/events' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Coming up' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Full calendar' })).toHaveAttribute('href', '/events')
  })

  it('renders an eyebrow style without an action', () => {
    render(<SectionHeading title="The whole year" eyebrow />)
    expect(screen.getByRole('heading', { level: 2 }).className).toContain('eyebrow')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
