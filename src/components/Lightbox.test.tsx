import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Lightbox, type LightboxItem } from './Lightbox'

const items: LightboxItem[] = [
  { id: 'a', src: '/a.svg', alt: 'First', caption: 'One' },
  { id: 'b', src: '/b.svg', alt: 'Second' },
  { id: 'c', src: '/c.svg', alt: 'Third', caption: 'Three' },
]

function Harness() {
  const [index, setIndex] = useState<number | null>(null)
  return (
    <>
      <button type="button" onClick={() => setIndex(1)}>
        open
      </button>
      <Lightbox items={items} index={index} onChange={setIndex} onClose={() => setIndex(null)} />
    </>
  )
}

describe('Lightbox', () => {
  it('is closed until asked, then shows the photo with controls and focus on close', async () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'open' }))
    const dialog = screen.getByRole('dialog', { name: 'Photo 2 of 3' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('img', { name: 'Second' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('moves with buttons and arrow keys, wraps, and closes on Escape returning focus', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'open' })
    await userEvent.click(opener)
    await userEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByRole('dialog', { name: 'Photo: Three' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog', { name: 'Photo: One' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('dialog', { name: 'Photo: Three' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it('closes on a click outside the photo and keeps Tab inside', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'open' }))
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Next photo' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await userEvent.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('swiping', () => {
  function swipe(dx: number, dy = 0) {
    const dialog = screen.getByRole('dialog')
    fireEvent.touchStart(dialog, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] })
  }

  async function open() {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'open' }))
    return screen.getByRole('dialog')
  }

  it('goes forward on a swipe left and back on a swipe right', async () => {
    await open()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo 2 of 3')
    swipe(-120)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo: Three')
    swipe(120)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo 2 of 3')
  })

  it('wraps around at the ends, as the arrows do', async () => {
    await open()
    swipe(120)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo: One')
    swipe(120)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo: Three')
  })

  it('ignores a tap, a wobble, and a mostly vertical drag', async () => {
    await open()
    const name = 'Photo 2 of 3'
    swipe(0)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(name)
    swipe(-20)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(name)
    // Dragging down the length of a tall photograph must not change the picture.
    swipe(-60, 200)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(name)
  })

  it('ignores a two-fingered gesture, which is a pinch to zoom', async () => {
    const dialog = await open()
    fireEvent.touchStart(dialog, {
      touches: [
        { clientX: 200, clientY: 300 },
        { clientX: 260, clientY: 300 },
      ],
    })
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 80, clientY: 300 }] })
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo 2 of 3')
  })
})

describe('a photograph that offers somewhere to go', () => {
  const single: LightboxItem[] = [{ id: 'only', src: '/only.svg', alt: 'Only', album: { slug: 'boishakhi-2026', title: 'Boishakhi 2026' } }]

  function SoloHarness() {
    const [index, setIndex] = useState<number | null>(0)
    return (
      <Lightbox
        items={single}
        index={index}
        onChange={setIndex}
        onClose={() => setIndex(null)}
        renderAction={(item) => (item.album ? <a href={`/gallery/${item.album.slug}`}>See all of {item.album.title}</a> : null)}
      />
    )
  }

  /**
   * One photograph means no arrows, so the link is the only thing besides Close that focus can
   * reach. A trap that counted buttons alone would send Tab from Close straight back to Close
   * and the link could never be reached without a mouse.
   */
  it('lets the keyboard reach the album link when there are no arrows', async () => {
    render(<SoloHarness />)
    expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'See all of Boishakhi 2026' })).toHaveFocus()
  })
})
