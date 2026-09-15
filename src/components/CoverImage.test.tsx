import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { COVER_ANIMATIONS, isCoverAnimation } from '@/domain/cover'
import { CoverImage } from './CoverImage'

const src = 'https://photos.13parbon.org.uk/full/boishakhi-2026-01.jpg'

describe('the cover photograph', () => {
  it('says so when there is not one, rather than leaving a gap', () => {
    render(<CoverImage />)
    expect(screen.getByText('No cover photograph yet')).toBeInTheDocument()
  })

  it('is decoration, and is announced as nothing at all', () => {
    // The heading beside it already says what the evening is, and a screen reader announcing a
    // photograph of the hall before the title helps nobody. An empty alt makes it presentational,
    // which is why it cannot be found by the img role.
    const { container } = render(<CoverImage src={src} />)
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('waits until it is near before loading', () => {
    const { container } = render(<CoverImage src={src} />)
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy')
  })

  it('adds no movement class when it is still', () => {
    const { container } = render(<CoverImage src={src} animation="none" />)
    // Just the base class. Compared by counting rather than by name: the names are hashed.
    expect(container.querySelector('img')!.className.split(' ')).toHaveLength(1)
  })

  it('carries one more class for each kind of movement', () => {
    for (const { value } of COVER_ANIMATIONS.filter((a) => a.value !== 'none')) {
      const { container, unmount } = render(<CoverImage src={src} animation={value} />)
      expect(container.querySelector('img')!.className.split(' '), value).toHaveLength(2)
      unmount()
    }
  })
})

describe('the choices offered', () => {
  it('stays small, because a noticeboard is not a slideshow', () => {
    expect(COVER_ANIMATIONS.length).toBeLessThanOrEqual(6)
  })

  it('says what each one does, in the committee’s words', () => {
    for (const option of COVER_ANIMATIONS) {
      expect(option.label.length).toBeGreaterThan(2)
      expect(option.note.length).toBeGreaterThan(20)
    }
  })

  it('leads with still, which is the right answer more often than not', () => {
    expect(COVER_ANIMATIONS[0].value).toBe('none')
  })

  it('recognises its own values and nothing else', () => {
    expect(isCoverAnimation('zoom')).toBe(true)
    expect(isCoverAnimation('spin')).toBe(false)
  })
})
