import { act, render, screen } from '@testing-library/react'
import { useScrollHeader } from './useScrollHeader'

function Probe({ pinned = false }: { pinned?: boolean }) {
  const { scrolled, hidden } = useScrollHeader(pinned)
  return <p>{`${scrolled ? 'scrolled' : 'top'} ${hidden ? 'hidden' : 'shown'}`}</p>
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
  })

  it('starts at the top, shown', () => {
    render(<Probe />)
    expect(screen.getByText('top shown')).toBeInTheDocument()
  })

  it('compacts once scrolled, hides on the way down, shows on the way up', () => {
    render(<Probe />)
    scrollTo(60)
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

  it('never hides near the top even when scrolling down', () => {
    render(<Probe />)
    scrollTo(40)
    scrollTo(100)
    expect(screen.getByText('scrolled shown')).toBeInTheDocument()
  })

  it('stays shown while pinned', () => {
    render(<Probe pinned />)
    scrollTo(300)
    scrollTo(600)
    expect(screen.getByText('scrolled shown')).toBeInTheDocument()
  })
})
