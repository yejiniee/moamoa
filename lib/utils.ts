import { nanoid } from 'nanoid'

export function generateShareToken(): string {
  return nanoid(8)
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
