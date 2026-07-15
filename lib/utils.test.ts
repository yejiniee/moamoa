import { describe, it, expect } from 'vitest'
import { generateShareToken, formatKRW, calcPercent, isFundingEnded, safeRedirect } from './utils'

describe('generateShareToken', () => {
  it('12자 문자열을 반환한다', () => {
    expect(generateShareToken()).toHaveLength(12)
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

  it('후원이 있으면 0.5% 미만이어도 0%가 아닌 최소 1%를 반환한다', () => {
    // 목표가 크고 후원이 소액일 때 Math.round로 0%가 되어 바가 비던 버그
    expect(calcPercent(100000, 23423423)).toBe(1) // 0.43%
    expect(calcPercent(20000, 46600000)).toBe(1) // 0.04%
    expect(calcPercent(1, 100000000)).toBe(1)
  })

  it('후원이 전혀 없으면 0%를 반환한다', () => {
    expect(calcPercent(0, 50000)).toBe(0)
  })
})

describe('isFundingEnded (펀딩 종료 여부)', () => {
  it('진행중(active)은 종료가 아니다', () => {
    expect(isFundingEnded('active')).toBe(false)
  })

  it('마감(closed)은 종료다', () => {
    expect(isFundingEnded('closed')).toBe(true)
  })

  // 회귀 방지: 정산완료(settled)가 목록 카드에서 종료로 처리되지 않던 버그
  it('정산완료(settled)도 종료다', () => {
    expect(isFundingEnded('settled')).toBe(true)
  })
})

describe('safeRedirect (오픈 리다이렉트 방지)', () => {
  it('내부 경로는 그대로 허용한다', () => {
    expect(safeRedirect('/mypage')).toBe('/mypage')
    expect(safeRedirect('/funding/abc/admin')).toBe('/funding/abc/admin')
  })

  it('값이 없으면 루트(/)로 보낸다', () => {
    expect(safeRedirect(null)).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect('')).toBe('/')
  })

  // 회귀 방지: 외부 사이트로 나가는 값은 모두 차단해야 한다
  it('외부/프로토콜상대 URL은 차단하고 루트로 보낸다', () => {
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('https://evil.com')).toBe('/')
    expect(safeRedirect('http://evil.com')).toBe('/')
    expect(safeRedirect('/\\evil.com')).toBe('/')
    expect(safeRedirect('evil.com')).toBe('/')
  })
})
