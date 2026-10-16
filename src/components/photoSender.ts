import type { Prepared } from '@/lib/images/prepare'
import { personPhotoKey, readUploadConfig, uploadPhoto } from '@/lib/api/uploads'
import { readSupabaseConfig } from '@/lib/api/supabase'
import { accessToken } from '@/lib/auth/supabaseAuth'

/** Puts a prepared photograph in the bucket and says where it is. Null where uploads are off. */
export type SendPhoto = (prepared: Prepared) => Promise<string>

/** The real one: the bucket, signed for with the signed-in person's own token. */
export function bucketSender(householdId: string): SendPhoto | null {
  const uploads = readUploadConfig(import.meta.env)
  const supabase = readSupabaseConfig(import.meta.env)
  if (!uploads || !supabase) return null
  return async (prepared) => {
    const token = await accessToken(supabase)
    if (!token) throw new Error('Sign in again, then try once more.')
    return (await uploadPhoto(uploads, personPhotoKey(householdId), prepared, token)).url
  }
}
