import { useEffect, useRef, useState } from 'react'

export type ShareResult = 'idle' | 'copied' | 'failed'

/**
 * Shares the page being looked at: the phone's share sheet where there is one, the link copied
 * where there is not. `result` and `message` say how the copy went, for a moment.
 */
export function useShare(): { share: (details: { title: string; text?: string }) => Promise<void>; result: ShareResult; message: string } {
  const [result, setResult] = useState<ShareResult>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const announce = (next: ShareResult) => {
    setResult(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setResult('idle'), 2600)
  }

  const share = async ({ title, text }: { title: string; text?: string }) => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // Dismissing the sheet lands here as well as a real failure, so fall through to the
        // copy rather than telling the viewer something went wrong when they simply changed
        // their mind.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      announce('copied')
    } catch {
      announce('failed')
    }
  }

  const message = result === 'copied' ? 'Link copied' : result === 'failed' ? 'Could not copy the link' : ''
  return { share, result, message }
}
