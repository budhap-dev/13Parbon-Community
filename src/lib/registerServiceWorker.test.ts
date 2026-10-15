import { describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './registerServiceWorker'

function phone(register = vi.fn().mockResolvedValue({})) {
  return { nav: { serviceWorker: { register } } as unknown as Navigator, register }
}

describe('starting the service worker that makes the site installable', () => {
  it('registers /sw.js in a real build once the page has loaded', () => {
    const { nav, register } = phone()
    registerServiceWorker(true, nav, window)
    // jsdom has finished loading by the time a test runs.
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('waits for the load event if the page is still loading', () => {
    const { nav, register } = phone()
    const win = new EventTarget() as unknown as Window
    Object.assign(win, { document: { readyState: 'loading' } })
    registerServiceWorker(true, nav, win)
    expect(register).not.toHaveBeenCalled()

    win.dispatchEvent(new Event('load'))
    expect(register).toHaveBeenCalledOnce()
  })

  it('leaves development alone, where a worker would serve stale files', () => {
    const { nav, register } = phone()
    registerServiceWorker(false, nav, window)
    expect(register).not.toHaveBeenCalled()
  })

  it('does nothing in a browser without service workers', () => {
    expect(() => registerServiceWorker(true, {} as Navigator, window)).not.toThrow()
  })

  it('keeps quiet when the browser refuses, since the site works without it', async () => {
    const { nav, register } = phone(vi.fn().mockRejectedValue(new Error('blocked')))
    registerServiceWorker(true, nav, window)
    expect(register).toHaveBeenCalledOnce()
    // Vitest fails the run on an unhandled rejection, so getting past this is the assertion.
    await new Promise((resolve) => setTimeout(resolve))
  })
})
