import { paragraphs } from './news'

describe('paragraphs', () => {
  it('splits on blank lines and drops empties', () => {
    expect(paragraphs('One.\n\nTwo.\n\n\n  Three.  \n')).toEqual(['One.', 'Two.', 'Three.'])
    expect(paragraphs('')).toEqual([])
  })
})
