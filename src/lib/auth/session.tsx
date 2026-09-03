import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Role } from '@/domain/household'

export type Audience = 'public' | 'members' | 'admins'

export type SignedIn = {
  role: Role
  householdId: string
  householdName: string
  name: string
  email: string
}

export type Session = { role: 'visitor' } | ({ role: Role } & SignedIn)

export const SESSION_STORAGE_KEY = '13parbon:preview-session'

const visitor: Session = { role: 'visitor' }

type SessionContextValue = {
  session: Session
  signIn: (who: SignedIn) => void
  signOut: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

/**
 * Who is signed in. Real sign-in will be Google through Supabase; until then the preview
 * sign-in puts a sample household here so the portal can be walked through.
 *
 * Kept in sessionStorage rather than localStorage on purpose: closing the tab signs you
 * out, which is the right default for something anyone can step into.
 */
export function SessionProvider({ initial, children }: { initial?: Session; children: ReactNode }) {
  const [session, setSession] = useState<Session>(() => initial ?? readStoredSession() ?? visitor)

  const signIn = useCallback((who: SignedIn) => {
    setSession(who)
    writeStoredSession(who)
  }, [])

  const signOut = useCallback(() => {
    setSession(visitor)
    writeStoredSession(null)
  }, [])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}

/** The signed-in household, or null for a visitor. */
export function useSignedIn(): SignedIn | null {
  const { session } = useSession()
  return session.role === 'visitor' ? null : session
}

/** Whether someone with this role may see content meant for this audience. */
export function canSee(audience: Audience, role: Session['role']): boolean {
  if (audience === 'public') return true
  if (audience === 'members') return role === 'member' || role === 'admin'
  return role === 'admin'
}

export function useCanSee(audience: Audience): boolean {
  return canSee(audience, useSession().session.role)
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

function readStoredSession(): Session | null {
  try {
    const raw = storage()?.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SignedIn> & { role?: string }
    if (parsed.role !== 'member' && parsed.role !== 'admin') return null
    if (!parsed.householdId || !parsed.name) return null
    return parsed as Session
  } catch {
    return null
  }
}

function writeStoredSession(who: SignedIn | null): void {
  try {
    if (who) storage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(who))
    else storage()?.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Private mode or blocked storage. The session just will not survive a reload.
  }
}
