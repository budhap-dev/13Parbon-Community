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
    expect(screen.getByRole('img', { name: 'First' })).toBeInTheDocument()
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Photo 1 of 3')).toBeInTheDocument()
  })

  it('moves with next, previous and dots, wrapping at both ends', async () => {
    render(<Carousel label="Photos" items={items} />)
    const status = () => screen.getByText(/Photo \d of 3/)
    await userEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(status()).toHaveTextContent('Photo 2 of 3')
    await userEvent.click(screen.getByRole('button', { name: 'Previous photo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous photo' }))
    expect(status()).toHaveTextContent('Photo 3 of 3')
    await userEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(status()).toHaveTextContent('Photo 1 of 3')
    await userEvent.click(screen.getByRole('button', { name: 'Go to photo 2' }))
    expect(status()).toHaveTextContent('Photo 2 of 3')
    expect(screen.getByRole('button', { name: 'Go to photo 2' })).toHaveAttribute('aria-current', 'true')
  })

  it('responds to arrow keys', async () => {
    render(<Carousel label="Photos" items={items} />)
    const region = screen.getByRole('region', { name: 'Photos' })
    await userEvent.click(screen.getByRole('button', { name: 'Next photo' }))
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
})
