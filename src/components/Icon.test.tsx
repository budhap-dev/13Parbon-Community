import { render } from '@testing-library/react'
import { Icon } from './Icon'

describe('Icon', () => {
  it('is decorative by default', () => {
    const { container } = render(<Icon name="menu" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-icon', 'menu')
  })

  it('becomes meaningful when labelled', () => {
    const { container } = render(<Icon name="close" aria-label="Close" size={16} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toHaveAttribute('aria-hidden')
    expect(svg).toHaveAttribute('width', '16')
  })
})
