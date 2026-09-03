import { render, screen } from '@testing-library/react'
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
