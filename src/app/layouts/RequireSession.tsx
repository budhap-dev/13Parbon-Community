import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/lib/auth/session'

/**
 * Guards the portal. This is a courtesy for the person browsing, not a lock: once there is
 * a real backend, the database decides what comes back, and a guessed address gets nothing.
 */
export function RequireSession({ role }: { role?: 'admin' }) {
  const { session } = useSession()
  const { pathname } = useLocation()

  if (session.role === 'visitor') return <Navigate to="/login" state={{ from: pathname }} replace />
  if (role === 'admin' && session.role !== 'admin') return <Navigate to="/portal" replace />
  return <Outlet />
}
