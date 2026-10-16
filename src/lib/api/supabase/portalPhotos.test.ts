import { describe, expect, it, vi } from 'vitest'
import type { Household, Person } from '@/domain/household'
import { removeDropped, type PhotoCleanup } from './portal'

const BUCKET = 'https://photos.13parbon.org.uk'
const url = (key: string) => `${BUCKET}/full/${key}.jpg`

const person = (name: string, photo?: string): Person => ({ id: name, name, ageGroup: 'adult', ...(photo ? { photo } : {}) })
const household = (...people: Person[]): Household =>
  ({ id: 'hh-1', name: 'The Sens', contactName: 'Rina Sen', people }) as unknown as Household

function cleanup(over: Partial<PhotoCleanup> = {}) {
  const remove = vi.fn(async () => {})
  return { remove, photos: { uploads: { signUrl: '/api/photos', publicUrl: BUCKET }, token: async () => 'token', remove, ...over } as PhotoCleanup }
}

/*
 * A photograph replaced or taken off comes out of the bucket once the save has gone through, so
 * "remove photo" means the file as well as the link — which is what the privacy notice says.
 */
describe('taking down the photographs a save dropped', () => {
  it('removes the ones that are gone and keeps the ones still in use', async () => {
    const { remove, photos } = cleanup()
    await removeDropped(
      photos,
      household(person('Rina Sen', url('person-hh1-old')), person('Arjun Sen', url('person-hh1-kept'))),
      household(person('Rina Sen', url('person-hh1-new')), person('Arjun Sen', url('person-hh1-kept'))),
    )
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith(expect.anything(), 'person-hh1-old', 'token')
  })

  it('removes every one when the household itself has gone', async () => {
    const { remove, photos } = cleanup()
    await removeDropped(photos, household(person('Rina Sen', url('person-hh1-a')), person('Arjun Sen', url('person-hh1-b'))), null)
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it('leaves alone anything not in our bucket, and does nothing where uploads are off', async () => {
    const { remove, photos } = cleanup()
    await removeDropped(photos, household(person('Rina Sen', 'https://elsewhere.example/full/x.jpg')), household(person('Rina Sen')))
    expect(remove).not.toHaveBeenCalled()

    const off = cleanup({ uploads: null })
    await removeDropped(off.photos, household(person('Rina Sen', url('person-hh1-a'))), null)
    expect(off.remove).not.toHaveBeenCalled()
  })

  it('does not turn a saved household into a failed save when the bucket says no', async () => {
    const { photos } = cleanup({ remove: vi.fn(async () => Promise.reject(new Error('503'))) })
    await expect(removeDropped(photos, household(person('Rina Sen', url('person-hh1-a'))), null)).resolves.toBeUndefined()
  })
})
