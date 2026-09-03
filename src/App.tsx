import { RouterProvider } from 'react-router'
import { AppProviders } from '@/app/providers'
import { createAppRouter } from '@/app/router'
import { createApi } from '@/lib/api'

// Content from fixtures; submissions go to Supabase when it is configured. See src/lib/api/create.ts.
const api = createApi()
const router = createAppRouter()

function App() {
  return (
    <AppProviders api={api}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
