import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Carousel, type CarouselItem } from './Carousel'

const items: CarouselItem[] = [
  { id: 'a', src: '/a.svg', alt: 'First', caption: 'One' },
  { id: 'b', src: '/b.svg', alt: 'Second', caption: 'Two' },
  { id: 'c', src: '/c.svg', alt: 'Third' },
]

describe('Carousel', () => {
  it('renders nothing without items', () => {
    const { container } = render(<Carousel label="Photos" items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes a labelled carousel region with slides and captions', () => {
    render(<Carousel label="Last year" items={items} />)
    expect(screen.getByRole('region', { name: 'Last year' })).toBeInTheDocument()
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Third', hidden: true })).toBeInTheDocument()
    expect(screen.getByText('Photo 1 of 3')).toBeInTheDocument()
  })

  it('moves with next, previous and dots, wrapping at both ends', async () => {
    render(<Carousel label="Photos" items={items} />)
    const status = () => screen.getByText(/Photo \d of 3/)
    await userEvent.click(screen.getByRole('button', { name: 'Next photos' }))
    expect(status()).toHaveTextContent('Photo 2 of 3')
    await userEvent.click(screen.getByRole('button', { name: 'Previous photos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous photos' }))
    expect(status()).toHaveTextContent('Photo 3 of 3')
    await userEvent.click(screen.getByRole('button', { name: 'Next photos' }))
    expect(status()).toHaveTextContent('Photo 1 of 3')
    await userEvent.click(screen.getByRole('button', { name: 'Go to photos 2' }))
    expect(status()).toHaveTextContent('Photo 2 of 3')
    expect(screen.getByRole('button', { name: 'Go to photos 2' })).toHaveAttribute('aria-current', 'true')
  })

  it('responds to arrow keys', async () => {
    render(<Carousel label="Photos" items={items} />)
    const region = screen.getByRole('region', { name: 'Photos' })
    await userEvent.click(screen.getByRole('button', { name: 'Next photos' }))
    region.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByText('Photo 3 of 3')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByText('Photo 2 of 3')).toBeInTheDocument()
  })

  it('auto-advances and pauses while hovered', () => {
    vi.useFakeTimers()
    render(<Carousel label="Photos" items={items} autoAdvanceMs={1000} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Photo 2 of 3')).toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Photos' }))
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('Photo 2 of 3')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('syncs the index from manual scrolling', () => {
    render(<Carousel label="Photos" items={items} />)
    const track = screen.getByRole('list', { description: /Photo 1 of 3/ })
    Object.defineProperty(track, 'clientWidth', { value: 500, configurable: true })
    Object.defineProperty(track, 'scrollLeft', { value: 1000, configurable: true })
    act(() => {
      track.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    expect(screen.getByText('Photo 3 of 3')).toBeInTheDocument()
  })

  /**
   * jsdom lays nothing out, so the component always measures one photograph per page there.
   * These drive the measurement by hand to check the sums it does with the answer: how many
   * pages there are, what the dots offer, and what a screen reader is told is on screen.
   */
  describe('with room for several photographs at a time', () => {
    function measureAs(slideWidth: number, trackWidth: number) {
      const callbacks: (() => void)[] = []
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(cb: () => void) {
            callbacks.push(cb)
          }
          observe() {}
          disconnect() {}
        },
      )
      return {
        apply(track: HTMLElement) {
          Object.defineProperty(track, 'clientWidth', { value: trackWidth, configurable: true })
          for (const child of Array.from(track.children)) {
            ;(child as HTMLElement).getBoundingClientRect = () => ({ width: slideWidth }) as DOMRect
          }
          act(() => {
            for (const cb of callbacks) cb()
          })
        },
      }
    }

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('puts three photographs on a page and needs no arrows for three of them', () => {
      const harness = measureAs(200, 600)
      render(<Carousel label="Photos" items={items} />)
      harness.apply(screen.getByRole('list', { description: /of 3/ }))
      expect(screen.getByText('Photos 1 to 3 of 3')).toBeInTheDocument()
      // One pageful holds them all, so there is nowhere to go.
      expect(screen.queryByRole('button', { name: 'Next photos' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Go to photos/ })).not.toBeInTheDocument()
    })

    it('pages by a screenful, not by one photograph', async () => {
      const six: CarouselItem[] = Array.from({ length: 6 }, (_, i) => ({
        id: String(i),
        src: `/${i}.svg`,
        alt: `Photo ${i + 1}`,
      }))
      const harness = measureAs(200, 600)
      render(<Carousel label="Photos" items={six} />)
      harness.apply(screen.getByRole('list', { description: /of 6/ }))
      expect(screen.getByText('Photos 1 to 3 of 6')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /^Go to photos/ })).toHaveLength(2)
      await userEvent.click(screen.getByRole('button', { name: 'Next photos' }))
      expect(screen.getByText('Photos 4 to 6 of 6')).toBeInTheDocument()
      // And wraps, as the single-photo version did.
      await userEvent.click(screen.getByRole('button', { name: 'Next photos' }))
      expect(screen.getByText('Photos 1 to 3 of 6')).toBeInTheDocument()
    })
  })

  /**
   * A swipe ends in a click as surely as a tap does, so opening on any click would mean every
   * swipe opened a photograph. Only a press that stayed still, over a strip that did not move,
   * counts.
   */
  describe('opening a photograph', () => {
    it('opens on a tap that did not travel', async () => {
      const onSelect = vi.fn()
      render(<Carousel label="Photos" items={items} onSelect={onSelect} />)
      await userEvent.click(screen.getByRole('button', { name: 'Open photo 2 of 3 full size' }))
      expect(onSelect).toHaveBeenCalledWith(1)
    })

    it('does not open when the finger travelled', () => {
      const onSelect = vi.fn()
      render(<Carousel label="Photos" items={items} onSelect={onSelect} />)
      const photo = screen.getByRole('button', { name: 'Open photo 1 of 3 full size' })
      fireEvent.pointerDown(photo, { clientX: 300, clientY: 200 })
      fireEvent.click(photo, { clientX: 120, clientY: 205 })
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('does not open when the strip scrolled under the finger', () => {
      const onSelect = vi.fn()
      render(<Carousel label="Photos" items={items} onSelect={onSelect} />)
      const track = screen.getByRole('list', { description: /of 3/ })
      const photo = screen.getByRole('button', { name: 'Open photo 1 of 3 full size' })
      Object.defineProperty(track, 'scrollLeft', { value: 0, writable: true, configurable: true })
      fireEvent.pointerDown(photo, { clientX: 300, clientY: 200 })
      ;(track as HTMLElement & { scrollLeft: number }).scrollLeft = 240
      fireEvent.click(photo, { clientX: 300, clientY: 200 })
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('opens from the keyboard, which sends a click with no press behind it', async () => {
      const onSelect = vi.fn()
      render(<Carousel label="Photos" items={items} onSelect={onSelect} />)
      screen.getByRole('button', { name: 'Open photo 3 of 3 full size' }).focus()
      await userEvent.keyboard('{Enter}')
      expect(onSelect).toHaveBeenCalledWith(2)
    })

    it('is not a button at all when nothing is offered', () => {
      render(<Carousel label="Photos" items={items} />)
      expect(screen.queryByRole('button', { name: /^Open photo/ })).not.toBeInTheDocument()
    })
  })
})
