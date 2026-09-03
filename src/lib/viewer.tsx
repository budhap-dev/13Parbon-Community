import { createContext, useContext, type ReactNode } from 'react'

export type Role = 'visitor' | 'member' | 'admin'
export type Audience = 'public' | 'members' | 'admins'

export type Viewer = { role: Role; name?: string }

const ViewerContext = createContext<Viewer>({ role: 'visitor' })

/**
 * Who is looking at the page. Until phase 2 wires up real login everyone is a visitor;
 * the provider exists so pages already ask the right question.
 */
export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
}

export function useViewer(): Viewer {
  return useContext(ViewerContext)
}

/** Whether a viewer with this role may see content meant for this audience. */
export function canSee(audience: Audience, role: Role): boolean {
  if (audience === 'public') return true
  if (audience === 'members') return role === 'member' || role === 'admin'
  return role === 'admin'
}

export function useCanSee(audience: Audience): boolean {
  return canSee(audience, useViewer().role)
}
