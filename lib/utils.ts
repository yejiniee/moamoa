import { nanoid } from 'nanoid'

export function generateShareToken(): string {
  return nanoid(8)
}

export function formatKRW(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

export function calcPercent(current: number, total: number): number {
  if (total === 0) return 0
  return Math.min(Math.round((current / total) * 100), 100)
}
