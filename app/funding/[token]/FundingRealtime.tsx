'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FundingProgress from '@/components/funding/FundingProgress'
import GiftList from '@/components/funding/GiftList'
import DonorList from '@/components/funding/DonorList'
import type { Gift, Payment } from '@/lib/supabase/types'

type Props = {
  fundingId: string
  gifts: Gift[]
  initialPayments: Payment[]
}

export default function FundingRealtime({ fundingId, gifts, initialPayments }: Props) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments)

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
              setPayments((prev) => [newPayment, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Payment
            setPayments((prev) => {
              const exists = prev.some((p) => p.id === updated.id)
              if (updated.status === 'confirmed') {
                if (exists) {
                  return prev.map((p) => (p.id === updated.id ? updated : p))
                }
                return [updated, ...prev]
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
      <FundingProgress totalRaised={totalRaised} totalGoal={totalGoal} />
      {gifts.length > 0 && <GiftList gifts={gifts} totalRaised={totalRaised} />}
      {payments.length > 0 && <DonorList payments={payments} />}
    </>
  )
}
