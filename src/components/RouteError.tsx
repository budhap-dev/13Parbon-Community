import { isRouteErrorResponse, useRouteError } from 'react-router'
import { NotFoundPage } from '@/features/placeholder'
import { ErrorPanel } from './ErrorPanel'

/**
 * The router's own failures: a route that could not be resolved, a chunk that would not
 * fetch. A 404 from the router is the same thing the not-found page already says, so it
 * defers to that; anything else is ours, and says so.
 */
export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  console.error('The router could not render this route:', error)
  return <ErrorPanel />
}
