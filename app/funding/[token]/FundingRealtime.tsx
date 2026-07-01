'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FundingProgress from '@/components/funding/FundingProgress'
import DonorRolling from '@/components/funding/DonorRolling'
import type { Gift, Payment } from '@/lib/supabase/types'

const MOCK_PAYMENTS: Payment[] =
  process.env.NODE_ENV === 'development'
    ? [
        { id: 'mock-1', funding_id: '', participant_name: '김민준', message: '생일 축하해!', amount: 30000, order_id: 'mock-1', payment_key: null, status: 'confirmed', created_at: '' },
        { id: 'mock-2', funding_id: '', participant_name: '이서연', message: '항상 응원할게요 :)', amount: 50000, order_id: 'mock-2', payment_key: null, status: 'confirmed', created_at: '' },
        { id: 'mock-3', funding_id: '', participant_name: '박지호', message: null, amount: 20000, order_id: 'mock-3', payment_key: null, status: 'confirmed', created_at: '' },
        { id: 'mock-4', funding_id: '', participant_name: '최아름', message: '많이많이 받아!', amount: 100000, order_id: 'mock-4', payment_key: null, status: 'confirmed', created_at: '' },
      ]
    : []

type Props = {
  fundingId: string
  gifts: Gift[]
  initialPayments: Payment[]
  isOwner: boolean
}

export default function FundingRealtime({ fundingId, gifts, initialPayments, isOwner }: Props) {
  const effectiveInitial = initialPayments.length === 0 ? MOCK_PAYMENTS : initialPayments
  const [payments, setPayments] = useState<Payment[]>(effectiveInitial)

  const totalGoal = gifts.reduce((sum, g) => sum + g.target_amount, 0)
  const totalRaised = payments.reduce((sum, p) => sum + p.amount, 0)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`payments:${fundingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `funding_id=eq.${fundingId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPayment = payload.new as Payment
            if (newPayment.status === 'confirmed') {
              setPayments((prev) => [...prev, newPayment])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Payment
            setPayments((prev) => {
              const exists = prev.some((p) => p.id === updated.id)
              if (updated.status === 'confirmed') {
                if (exists) return prev.map((p) => (p.id === updated.id ? updated : p))
                return [...prev, updated]
              }
              return prev.filter((p) => p.id !== updated.id)
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fundingId])

  return (
    <>
      <DonorRolling payments={payments} isOwner={isOwner} />
      <div className="mt-4">
        <FundingProgress totalRaised={totalRaised} totalGoal={totalGoal} />
      </div>
    </>
  )
}
