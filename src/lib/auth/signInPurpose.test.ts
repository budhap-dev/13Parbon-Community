import { afterEach, describe, expect, it, vi } from 'vitest'
import { PURPOSE_STORAGE_KEY, forgetPurpose, purposeNow, rememberPurpose } from './signInPurpose'

/**
 * Which door somebody used, and what happens when the browser will not remember.
 *
 * Every accessor here is wrapped in try/catch, because `localStorage` throws rather than
 * returning null in a private window and wherever site data is blocked. The fallback matters:
 * it has to be `member`, the answer that turns an unrecognised address away from the portal.
 * Falling back to `feedback` would mean a browser with storage switched off quietly tolerated
 * accounts the allowlist was written to refuse.
 */
afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.removeItem(PURPOSE_STORAGE_KEY)
})

describe('when the browser remembers', () => {
  it('starts at the portal, which is the cautious answer', () => {
    expect(purposeNow()).toBe('member')
  })

  it('keeps whichever door was used, and lets it be cleared', () => {
    rememberPurpose('feedback')
    expect(purposeNow()).toBe('feedback')
    rememberPurpose('member')
    expect(purposeNow()).toBe('member')
    rememberPurpose('feedback')
    forgetPurpose()
    expect(purposeNow()).toBe('member')
  })

  it('reads anything unexpected as the portal', () => {
    window.localStorage.setItem(PURPOSE_STORAGE_KEY, 'something-else-entirely')
    expect(purposeNow()).toBe('member')
  })
})

describe('when it will not', () => {
  it('falls back to the portal rather than throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('site data is blocked')
    })
    expect(purposeNow()).toBe('member')
  })

  it('carries on when nothing can be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('site data is blocked')
    })
    expect(() => rememberPurpose('feedback')).not.toThrow()
  })

  it('carries on when nothing can be cleared', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('site data is blocked')
    })
    expect(() => forgetPurpose()).not.toThrow()
  })
})
