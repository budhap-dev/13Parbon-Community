import { Analytics } from '@vercel/analytics/react'
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
      {/*
       * Page counts from Vercel: no cookies, no identifiers kept, nothing that follows anyone
       * between sites. It is here so the committee can see which pages people actually read.
       * It does nothing outside a Vercel deployment, so local runs and the test suite are
       * unaffected. What it collects is described on the privacy page: keep the two in step.
       */}
      <Analytics />
    </AppProviders>
  )
}

export default App
