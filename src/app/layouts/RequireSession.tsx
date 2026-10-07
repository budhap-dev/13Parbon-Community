import { Navigate, Outlet, useLocation } from 'react-router'
import { useViewer } from '@/lib/api'
import { useAuthSettling } from '@/lib/auth/GoogleSignIn'
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
  const settling = useAuthSettling()
  const { pathname } = useLocation()

  /*
   * Google sends somebody back to /portal with the code still in the address bar, and reading
   * it takes a moment. Before this, the guard asked "signed in?", heard "no", and sent them to
   * /login — where they sat looking at a sign-in button, already signed in.
   */
  if (settling) return <p aria-busy="true">Signing you in…</p>

  if (!can(viewer, 'portal:enter')) return <Navigate to="/login" state={{ from: pathname }} replace />
  if (role === 'admin' && !can(viewer, 'admin:enter')) return <Navigate to="/portal" replace />
  return <Outlet />
}
