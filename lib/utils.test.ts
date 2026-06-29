import { describe, it, expect } from 'vitest'
import { generateShareToken, formatKRW, calcPercent } from './utils'

describe('generateShareToken', () => {
  it('8자 문자열을 반환한다', () => {
    expect(generateShareToken()).toHaveLength(8)
  })

  it('호출마다 다른 값을 반환한다', () => {
    expect(generateShareToken()).not.toBe(generateShareToken())
  })
})

describe('formatKRW', () => {
  it('금액을 원화 형식으로 변환한다', () => {
    expect(formatKRW(50000)).toBe('50,000원')
    expect(formatKRW(1000)).toBe('1,000원')
    expect(formatKRW(1000000)).toBe('1,000,000원')
  })

  it('0원을 처리한다', () => {
    expect(formatKRW(0)).toBe('0원')
  })
})

describe('calcPercent', () => {
  it('달성률을 계산한다', () => {
    expect(calcPercent(50000, 100000)).toBe(50)
    expect(calcPercent(100000, 100000)).toBe(100)
    expect(calcPercent(0, 100000)).toBe(0)
  })

  it('100%를 초과하지 않는다', () => {
    expect(calcPercent(150000, 100000)).toBe(100)
  })

  it('total이 0이면 0을 반환한다', () => {
    expect(calcPercent(0, 0)).toBe(0)
  })
})
