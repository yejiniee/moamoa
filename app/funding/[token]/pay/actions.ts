'use server'

import { createServiceClient } from '@/lib/supabase/server'

// 결제 1건당 상한 (비정상 금액/오버플로 방지)
const MAX_PAYMENT_AMOUNT = 10_000_000

export async function createPendingPayment(
  fundingId: string,
  participantName: string,
  message: string,
  amount: number
): Promise<{ orderId: string } | { error: string }> {
  if (!Number.isInteger(amount)) return { error: '결제 금액이 올바르지 않습니다' }
  if (amount < 1000) return { error: '최소 결제 금액은 1,000원입니다' }
  if (amount > MAX_PAYMENT_AMOUNT) return { error: '결제 금액이 너무 큽니다' }
  if (!participantName.trim()) return { error: '이름을 입력해주세요' }

  const supabase = createServiceClient()

  // 대상 펀딩이 존재하고 진행중(active)일 때만 결제행을 만든다.
  // (클라이언트가 fundingId를 임의로 보낼 수 있으므로 서버에서 반드시 확인)
  const { data: funding } = await supabase
    .from('fundings')
    .select('status')
    .eq('id', fundingId)
    .single()

  if (!funding) return { error: '펀딩을 찾을 수 없습니다' }
  if (funding.status !== 'active') return { error: '마감된 펀딩에는 참여할 수 없습니다' }

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
