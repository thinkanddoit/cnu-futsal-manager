import { describe, it, expect } from 'vitest'
import { isMatchInPast } from './matchTime'

describe('isMatchInPast', () => {
  it('날짜와 시간이 현재보다 과거면 true', () => {
    expect(isMatchInPast('2020-01-01', '10:00')).toBe(true)
  })

  it('날짜와 시간이 현재보다 미래면 false', () => {
    expect(isMatchInPast('2099-12-31', '23:59')).toBe(false)
  })

  it('오늘 날짜라도 시간이 지났으면 true', () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    expect(isMatchInPast(dateStr, '00:00')).toBe(true)
  })

  it('오늘 날짜라도 시간이 안 지났으면 false', () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    expect(isMatchInPast(dateStr, '23:59')).toBe(false)
  })
})
