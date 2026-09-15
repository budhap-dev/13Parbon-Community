import { Navigate, Outlet, useLocation } from 'react-router'
import { useViewer } from '@/lib/api'
import { can } from '@/lib/auth/permissions'

/**
 * Guards the portal. This is a courtesy for the person browsing, not a lock: the database
 * decides what comes back, and a guessed address gets nothing whatever this returns.
 *
 * It asks `can()` rather than reading the role itself, so that a route and the button that
 * links to it cannot drift into disagreeing about who is allowed where.
 */
export function RequireSession({ role }: { role?: 'admin' }) {
  const viewer = useViewer()
  const { pathname } = useLocation()

  if (!can(viewer, 'portal:enter')) return <Navigate to="/login" state={{ from: pathname }} replace />
  if (role === 'admin' && !can(viewer, 'admin:enter')) return <Navigate to="/portal" replace />
  return <Outlet />
}
