import { RouterProvider } from 'react-router'
import { AppProviders } from '@/app/providers'
import { createAppRouter } from '@/app/router'
import { createMockApi } from '@/lib/api'

// Phase 1 ships against the mock adapter. Swap this for the real client at phase 2.
const api = createMockApi()
const router = createAppRouter()

function App() {
  return (
    <AppProviders api={api}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
