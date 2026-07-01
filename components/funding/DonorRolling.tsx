'use client'

import { useEffect, useState } from 'react'

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

// todo: 나중에 ui 수정 예정
export default function DonorRolling({ payments, isOwner }: Props) {
  const [index, setIndex] = useState(0)
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (payments.length <= 1) return
    const timer = setInterval(() => {
      setShow(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % payments.length)
        setShow(true)
      }, 300)
    }, 3000)
    return () => clearInterval(timer)
  }, [payments.length])

  if (payments.length === 0) return null

  const p = payments[index]
  const name = isOwner ? p.participant_name : maskName(p.participant_name)

  return (
    <div className="relative" style={{ marginBottom: '14px' }}>
      <div
        className="rounded-xl px-4"
        style={{ background: 'rgba(0,0,0,0.45)', height: '44px', display: 'flex', alignItems: 'center' }}
      >
        <div
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
          }}
        >
          <span className="text-sm font-semibold text-white shrink-0">{name}</span>
          {p.message && (
            <span className="text-xs text-white/50 truncate">&ldquo;{p.message}&rdquo;</span>
          )}
        </div>
      </div>
      {/* 말풍선 꼬리 — 왼쪽 하단 */}
      <div
        style={{
          position: 'absolute',
          bottom: -10,
          left: 16,
          width: 0,
          height: 0,
          borderTop: '10px solid rgba(0,0,0,0.45)',
          borderRight: '12px solid transparent',
        }}
      />
    </div>
  )
}
