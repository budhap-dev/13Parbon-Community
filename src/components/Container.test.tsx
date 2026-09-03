import { render, screen } from '@testing-library/react'
import { Container } from './Container'

describe('Container', () => {
  it('wraps its children and accepts extra classes', () => {
    render(
      <Container className="extra">
        <p>inside</p>
      </Container>,
    )
    const inner = screen.getByText('inside')
    expect(inner.parentElement?.className).toContain('container')
    expect(inner.parentElement?.className).toContain('extra')
  })
})
