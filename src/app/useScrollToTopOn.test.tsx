import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useScrollToTopOn } from './useScrollToTopOn'

function Screen() {
  const [editing, setEditing] = useState<string | null>(null)
  useScrollToTopOn(editing)
  return <button onClick={() => setEditing(editing ? null : 'form')}>{editing ?? 'list'}</button>
}

describe('getting back to the top when a screen swaps what it shows', () => {
  it('does nothing on arrival, which is ScrollRestoration\'s business', () => {
    const scrollTo = vi.fn()
    window.scrollTo = scrollTo as never
    render(<Screen />)
    // Including restoring where somebody was when they pressed Back, which this must not fight.
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('goes to the top when the view changes, both ways', async () => {
    const scrollTo = vi.fn()
    window.scrollTo = scrollTo as never
    render(<Screen />)

    // Opening a form from a button at the foot of a long page.
    await userEvent.click(screen.getByRole('button'))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 })

    // And leaving it again, which lands on the list rather than halfway down it.
    await userEvent.click(screen.getByRole('button'))
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })
})
