import { nanoid } from 'nanoid'
import type { FundingStatus } from '@/lib/supabase/types'

export function generateShareToken(): string {
  return nanoid(8)
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

export function calcPercent(current: number, total: number): number {
  if (total <= 0 || current <= 0) return 0
  const percent = (current / total) * 100
  // 후원이 있으면 반올림으로 0%가 되어 바가 비어 보이는 것을 막기 위해 최소 1%를 보장한다
  return Math.min(Math.max(Math.round(percent), 1), 100)
}
