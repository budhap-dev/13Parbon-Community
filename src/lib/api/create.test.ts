import { createApi } from './create'

describe('createApi', () => {
  it('falls back to the mock when Supabase is not configured', () => {
    expect(createApi({}).delivers).toBe(false)
  })

  it('delivers submissions once both Supabase values are set', () => {
    expect(createApi({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }).delivers).toBe(true)
  })
})
