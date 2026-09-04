import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareButton } from './ShareButton'

const props = { title: 'Cultural programme · 13Parbon Community', text: 'Our Mahalaya Day.' }

describe('ShareButton', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share')
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('opens the share sheet with the page it is on', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(<ShareButton {...props} />)

    await userEvent.click(screen.getByRole('button', { name: /Share/ }))
    expect(share).toHaveBeenCalledWith({ ...props, url: window.location.href })
    // The sheet is the whole interaction; nothing needs saying on the page.
    expect(screen.queryByText('Link copied')).not.toBeInTheDocument()
  })

  it('copies the link where there is no share sheet, and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<ShareButton {...props} />)

    await userEvent.click(screen.getByRole('button', { name: /Share/ }))
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })

  it('falls back to copying when the viewer dismisses the sheet', async () => {
    // A dismissed sheet rejects exactly like a failure does, so it must not be reported as one.
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(new Error('AbortError')), configurable: true })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<ShareButton {...props} />)

    await userEvent.click(screen.getByRole('button', { name: /Share/ }))
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
    expect(screen.queryByText(/Could not copy/)).not.toBeInTheDocument()
  })

  it('says so when it cannot copy either', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    render(<ShareButton {...props} />)

    await userEvent.click(screen.getByRole('button', { name: /Share/ }))
    expect(await screen.findByText('Could not copy the link')).toBeInTheDocument()
  })
})
