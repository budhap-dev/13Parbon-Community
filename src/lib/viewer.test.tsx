import { render, screen } from '@testing-library/react'
import { canSee, useCanSee, useViewer, ViewerProvider } from './viewer'

function Probe() {
  const { role } = useViewer()
  return <p>{`${role} ${useCanSee('members') ? 'sees' : 'hides'} members`}</p>
}

describe('viewer', () => {
  it('defaults to a visitor who cannot see member content', () => {
    render(<Probe />)
    expect(screen.getByText('visitor hides members')).toBeInTheDocument()
  })

  it('lets members and admins see member content, admins only for admin content', () => {
    render(
      <ViewerProvider viewer={{ role: 'member', name: 'A' }}>
        <Probe />
      </ViewerProvider>,
    )
    expect(screen.getByText('member sees members')).toBeInTheDocument()
    expect(canSee('public', 'visitor')).toBe(true)
    expect(canSee('admins', 'member')).toBe(false)
    expect(canSee('admins', 'admin')).toBe(true)
  })
})
