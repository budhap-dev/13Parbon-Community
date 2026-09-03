import { createContext, useContext, type ReactNode } from 'react'

export type Clock = () => Date

const ClockContext = createContext<Clock>(() => new Date())

/** Lets tests and previews pin "now" so countdowns and fixtures are deterministic. */
export function ClockProvider({ now, children }: { now: Clock; children: ReactNode }) {
  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>
}

export function useNow(): Date {
  return useContext(ClockContext)()
}
