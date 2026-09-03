import { slotsRemaining } from './volunteer'

describe('slotsRemaining', () => {
  it('subtracts filled from slots and never goes negative', () => {
    expect(slotsRemaining({ slots: 5, filled: 3 })).toBe(2)
    expect(slotsRemaining({ slots: 2, filled: 4 })).toBe(0)
  })
})
