import { render } from '@testing-library/react'
import { Backdrop } from './backdrops'

describe('Backdrop', () => {
  it.each([
    ['festival', 'alpona', ['wheel']],
    ['poila-boishakh', 'fish', ['fish']],
    ['saraswati', 'veena', ['strings', 'notes']],
    ['holi', 'splash', ['splashes']],
    ['mahalaya', 'kash', ['stems', 'train', 'smoke']],
  ] as const)('%s renders the %s motif with its moving parts', (theme, motif, parts) => {
    const { container } = render(<Backdrop theme={theme} />)
    expect(container.querySelector(`[data-backdrop="${motif}"]`)).toBeInTheDocument()
    for (const part of parts) {
      expect(container.querySelector(`[data-animate="${part}"]`)).toBeInTheDocument()
    }
  })

  it('throws a spread of bursts, each with flecks of its own', () => {
    const { container } = render(<Backdrop theme="holi" />)
    const bursts = container.querySelectorAll('[data-animate="splashes"] > g')
    // Enough of them, overlapping, that the motif is never empty between throws.
    expect(bursts.length).toBeGreaterThanOrEqual(8)
    // A splat and the flecks thrown clear of it.
    expect(bursts[0].querySelectorAll('path')).toHaveLength(1)
    expect(bursts[0].querySelectorAll('circle')).toHaveLength(5)
    // None of them is the magenta the page already is.
    const fills = [...container.querySelectorAll('[data-animate="splashes"] path')].map((p) => p.getAttribute('fill'))
    expect(fills).not.toContain('#e0369a')
    expect(new Set(fills).size).toBeGreaterThanOrEqual(5)
  })
})
