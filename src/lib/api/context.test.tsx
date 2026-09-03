import { render, screen } from '@testing-library/react'
import { ApiProvider, useApi } from './context'
import { createMockApi } from './mock'

function Probe() {
  const api = useApi()
  return <p>{typeof api.events.getNext}</p>
}

describe('ApiProvider', () => {
  it('provides the client to descendants', () => {
    render(
      <ApiProvider api={createMockApi()}>
        <Probe />
      </ApiProvider>,
    )
    expect(screen.getByText('function')).toBeInTheDocument()
  })

  it('throws a helpful error outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/inside <ApiProvider>/)
    spy.mockRestore()
  })
})
