import { act, render, screen } from '@testing-library/react'
import { useScrollHeader } from './useScrollHeader'

function Probe({ pinned = false }: { pinned?: boolean }) {
  const { scrolled, hidden } = useScrollHeader(pinned)
  return <p>{`${scrolled ? 'scrolled' : 'top'} ${hidden ? 'hidden' : 'shown'}`}</p>
}

function setPageHeight(px: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: px, configurable: true })
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

describe('useScrollHeader', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    setPageHeight(window.innerHeight * 4)
  })

  it('starts at the top, shown', () => {
    render(<Probe />)
    expect(screen.getByText('top shown')).toBeInTheDocument()
  })

  it('picks up the scrolled state, hides on the way down, shows on the way up', () => {
    render(<Probe />)
    scrollTo(100)
    expect(screen.getByText('scrolled shown')).toBeInTheDocument()
    scrollTo(400)
    expect(screen.getByText('scrolled hidden')).toBeInTheDocument()
    scrollTo(402)
    expect(screen.getByText('scrolled hidden')).toBeInTheDocument()
    scrollTo(350)
    expect(screen.getByText('scrolled shown')).toBeInTheDocument()
    scrollTo(0)
    expect(screen.getByText('top shown')).toBeInTheDocument()
  })

  /**
   * The bug this guards against: one threshold meant a viewer resting near it could see the
   * bar toggle back and forth. The two thresholds must not meet.
   */
  it('does not flip back and forth while hovering around the threshold', () => {
    render(<Probe />)
    scrollTo(100)
    expect(screen.getByText('scrolled shown')).toBeInTheDocument()
    for (const y of [64, 40, 60, 30, 55]) {
      scrollTo(y)
      expect(screen.getByText('scrolled shown')).toBeInTheDocument()
    }
    scrollTo(10)
    expect(screen.getByText('top shown')).toBeInTheDocument()
    for (const y of [30, 50, 70]) {
      scrollTo(y)
      expect(screen.getByText('top shown')).toBeInTheDocument()
    }
  })

  it('never hides near the top even when scrolling down', () => {
    render(<Probe />)
    scrollTo(40)
    scrollTo(120)
    expect(screen.getByText('scrolled shown')).toBeInTheDocument()
  })

  it('leaves the bar alone on a page with barely anything to scroll', () => {
    setPageHeight(window.innerHeight + 40)
    render(<Probe />)
    scrollTo(300)
    scrollTo(600)
    expect(screen.getByText('scrolled shown')).toBeInTheDocument()
  })

  it('stays shown while pinned', () => {
    render(<Probe pinned />)
    scrollTo(300)
    scrollTo(600)
    expect(screen.getByText('scrolled shown')).toBeInTheDocument()
  })
})
