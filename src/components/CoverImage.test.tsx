import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { COVER_ANIMATIONS, COVER_KINDS, isCoverAnimation } from '@/domain/cover'
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
    for (const { value } of COVER_ANIMATIONS.filter((a) => a.value !== 'none' && a.value !== 'colour')) {
      const { container, unmount } = render(<CoverImage src={src} animation={value} />)
      expect(container.querySelector('img')!.className.split(' '), value).toHaveLength(2)
      unmount()
    }
  })

  it('holds the movement until the photograph has arrived, then lets it play', () => {
    // On a phone a large photograph takes a second or two. A fade that started with the page
    // finished before there was anything to see, and the photograph simply appeared.
    const { container } = render(<CoverImage src={src} animation="fade" />)
    const img = container.querySelector('img')!
    expect(img).not.toHaveAttribute('data-ready')
    fireEvent.load(img)
    expect(img).toHaveAttribute('data-ready')
  })

  it('starts again from the first frame when the photograph changes', () => {
    const { container, rerender } = render(<CoverImage src={src} animation="fade" />)
    fireEvent.load(container.querySelector('img')!)
    rerender(<CoverImage src={`${src}?another`} animation="fade" />)
    expect(container.querySelector('img')).not.toHaveAttribute('data-ready')
  })

  it('does not hold a photograph back for ever when it will not load', () => {
    const { container } = render(<CoverImage src={src} animation="rise" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toHaveAttribute('data-ready')
  })

  it('sweeps into colour as the then-and-now photographs do: the photograph twice, and a seam', () => {
    const { container } = render(<CoverImage src={src} animation="colour" />)
    const [then, now] = container.querySelectorAll('img')
    expect(then).toHaveAttribute('src', src)
    expect(now).toHaveAttribute('src', src)
    // The colour copy is the same picture again, so it is not announced twice.
    expect(now).toHaveAttribute('aria-hidden', 'true')
    const frame = container.firstElementChild!
    expect(frame).not.toHaveAttribute('data-ready')
    fireEvent.load(then)
    expect(frame).toHaveAttribute('data-ready')
  })
})

describe('the choices offered', () => {
  it('stays small, because a noticeboard is not a slideshow', () => {
    // Still, three that happen once, three that keep going. Grouped in the menu by which.
    expect(COVER_ANIMATIONS.length).toBeLessThanOrEqual(7)
  })

  it('says of every movement whether it stops or keeps going', () => {
    const kinds = new Set(COVER_KINDS.map((k) => k.kind))
    for (const option of COVER_ANIMATIONS.filter((a) => a.value !== 'none')) expect(kinds.has(option.kind as never), option.value).toBe(true)
  })

  it('still knows the movement evenings were saved with before the menu changed', () => {
    for (const saved of ['none', 'zoom', 'drift', 'fade', 'colour']) expect(isCoverAnimation(saved)).toBe(true)
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
