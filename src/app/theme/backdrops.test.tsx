import { render } from '@testing-library/react'
import { Backdrop } from './backdrops'

describe('Backdrop', () => {
  it.each([
    ['festival', 'alpona', ['wheel']],
    ['poila-boishakh', 'fish', ['fish']],
    ['saraswati', 'veena', ['strings', 'notes']],
    ['holi', 'splash', ['splashes', 'drips']],
    ['mahalaya', 'kash', ['stems', 'train', 'smoke']],
  ] as const)('%s renders the %s motif with its moving parts', (theme, motif, parts) => {
    const { container } = render(<Backdrop theme={theme} />)
    expect(container.querySelector(`[data-backdrop="${motif}"]`)).toBeInTheDocument()
    for (const part of parts) {
      expect(container.querySelector(`[data-animate="${part}"]`)).toBeInTheDocument()
    }
  })
})
