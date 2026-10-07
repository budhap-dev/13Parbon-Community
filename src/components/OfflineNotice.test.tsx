import { act, render, screen } from '@testing-library/react'
import { OfflineNotice } from './OfflineNotice'

function goOffline(offline: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => !offline })
  window.dispatchEvent(new Event(offline ? 'offline' : 'online'))
}

afterEach(() => goOffline(false))

describe('OfflineNotice', () => {
  it('says nothing while the device is online', () => {
    render(<OfflineNotice />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('says so when the connection goes, and goes away when it comes back', () => {
    render(<OfflineNotice />)
    act(() => goOffline(true))
    expect(screen.getByRole('status')).toHaveTextContent(/You are offline/)
    act(() => goOffline(false))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
