import { nanoid } from 'nanoid'
import type { FundingStatus } from '@/lib/supabase/types'

// 공유 토큰은 URL로 노출되므로 열거(enumeration)를 어렵게 하려고 충분한 길이를 쓴다.
// nanoid 12자 = 64^12 ≈ 4.7e21 조합.
export function generateShareToken(): string {
  return nanoid(12)
}

// 펀딩이 종료 상태인지 판단한다.
// 상태 흐름: active(진행중) → closed(마감) → settled(정산완료)
// 진행중이 아니면(=마감·정산완료) 모두 종료로 취급한다.
export function isFundingEnded(status: FundingStatus): boolean {
  return status !== 'active'
}

export function formatKRW(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

// 오픈 리다이렉트 방지: 같은 사이트 내부 경로만 허용한다.
// "//evil.com", "https://evil.com", "/\evil.com" 등 외부로 나가는 값은 버린다.
export function safeRedirect(value: string | null | undefined): string {
  if (!value) return '/'
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}

export function calcPercent(current: number, total: number): number {
  if (total <= 0 || current <= 0) return 0
  const percent = (current / total) * 100
  // 후원이 있으면 반올림으로 0%가 되어 바가 비어 보이는 것을 막기 위해 최소 1%를 보장한다
  return Math.min(Math.max(Math.round(percent), 1), 100)
}
