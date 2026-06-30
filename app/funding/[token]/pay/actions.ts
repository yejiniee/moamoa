'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function createPendingPayment(
  fundingId: string,
  participantName: string,
  message: string,
  amount: number
): Promise<{ orderId: string } | { error: string }> {
  if (amount < 1000) return { error: '최소 결제 금액은 1,000원입니다' }
  if (!participantName.trim()) return { error: '이름을 입력해주세요' }

  const supabase = createServiceClient()
  const orderId = `moamoa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const { error } = await supabase.from('payments').insert({
    funding_id: fundingId,
    participant_name: participantName.trim(),
    message: message.trim() || null,
    amount,
    order_id: orderId,
    status: 'pending',
  })

  if (error) return { error: error.message }
  return { orderId }
}
