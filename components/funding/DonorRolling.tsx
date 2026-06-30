'use client'

import { useEffect, useRef } from 'react'
import { formatKRW } from '@/lib/utils'
import type { Payment } from '@/lib/supabase/types'

function maskName(name: string): string {
  if (name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  const mid = Math.floor(name.length / 2)
  return name.slice(0, mid) + '*'.repeat(name.length - mid * 2 > 0 ? 1 : 0) + name.slice(mid + 1)
}

type Props = {
  payments: Payment[]
  isOwner: boolean
}

export default function DonorRolling({ payments, isOwner }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || payments.length === 0) return

    // 애니메이션 속도: 항목 수 * 3초
    const duration = Math.max(payments.length * 3, 10)
    track.style.animationDuration = `${duration}s`
  }, [payments.length])

  if (payments.length === 0) return null

  // 롤링을 위해 배열 2배 복제
  const doubled = [...payments, ...payments]

  return (
    <div className="overflow-hidden rounded-xl bg-rose-50 py-3">
      <div
        ref={trackRef}
        className="flex gap-4 animate-scroll-x"
        style={{ width: 'max-content' }}
      >
        {doubled.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            className="shrink-0 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-rose-100"
          >
            <span className="text-sm font-medium text-gray-800">
              {isOwner ? p.participant_name : maskName(p.participant_name)}
            </span>
            <span className="text-xs text-rose-500 font-semibold">{formatKRW(p.amount)}</span>
            {p.message && (
              <span className="text-xs text-gray-400 max-w-[100px] truncate">&ldquo;{p.message}&rdquo;</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
