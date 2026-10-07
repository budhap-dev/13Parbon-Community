import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Role } from '@/domain/household'

export type Audience = 'public' | 'members' | 'admins'

export type SignedIn = {
  role: Role
  householdId: string
  householdName: string
  name: string
  email: string
  /**
   * Set only by the preview sign-in, so the portal can say which one you are in.
   *
   * Without it the banner saying "nothing you change is saved yet" was drawn for everybody,
   * including somebody signed in with Google against the real database — who is told their
   * real edits are make-believe, which is the one thing a back office must never get wrong.
   */
  preview?: true
}

export type Session = { role: 'visitor' } | ({ role: Role } & SignedIn)

export const SESSION_STORAGE_KEY = '13parbon:preview-session'

const visitor: Session = { role: 'visitor' }

type SessionContextValue = {
  session: Session
  signIn: (who: SignedIn) => void
  signOut: () => void
  /** Step into a sample household, keeping your own session to come back to. */
  enterPreview: (who: SignedIn) => void
  leavePreview: () => void
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
  /** Whoever was really signed in before a preview was opened, to come back to. */
  const [held, setHeld] = useState<SignedIn | null>(null)

  const signIn = useCallback((who: SignedIn) => {
    setSession(who)
    writeStoredSession(who)
  }, [])

  const signOut = useCallback(() => {
    setSession(visitor)
    setHeld(null)
    writeStoredSession(null)
  }, [])

  /*
   * Deliberately not written to storage.
   *
   * The real session stays the stored one, so a reload puts you back in your own account
   * rather than stranding you in a sample household with no way out — which is what would
   * happen the moment somebody opened a preview and hit refresh.
   */
  const enterPreview = useCallback(
    (who: SignedIn) => {
      if (session.role !== 'visitor' && !session.preview) setHeld(session)
      setSession({ ...who, preview: true })
    },
    [session],
  )

  const leavePreview = useCallback(() => {
    setSession(held ?? readStoredSession() ?? visitor)
    setHeld(null)
  }, [held])

  const value = useMemo(
    () => ({ session, signIn, signOut, enterPreview, leavePreview }),
    [session, signIn, signOut, enterPreview, leavePreview],
  )
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
