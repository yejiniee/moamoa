import type { createServiceClient } from '@/lib/supabase/server'
import { closeFundingIfTargetReached } from './settlement'

type ServiceClient = ReturnType<typeof createServiceClient>

export type PaymentRow = {
  order_id: string
  funding_id: string
  amount: number
  status: string
}

// 토스가 알려주는 "권위 있는(authoritative)" 실제 결제 상태.
// 반드시 토스 API를 통해 얻은 값이어야 한다(클라이언트/웹훅 본문을 그대로 신뢰하지 않는다).
export type Authoritative = {
  status?: string
  totalAmount?: number
  paymentKey: string
}

export type ReconcileResult = 'confirmed' | 'failed' | 'amount_mismatch' | 'noop' | 'error'

// 실제 결제 상태(authoritative)에 맞춰 우리 결제행을 보정한다.
// 웹훅(paymentKey 조회)과 복구 배치/실패정리(orderId 조회)가 공유하는 단일 결정 로직.
export async function reconcilePayment(
  supabase: ServiceClient,
  payment: PaymentRow,
  authoritative: Authoritative
): Promise<ReconcileResult> {
  if (payment.status === 'confirmed') return 'noop' // 이미 반영됨

  if (authoritative.status === 'DONE') {
    if (authoritative.totalAmount !== payment.amount) {
      // 실제 결제 금액과 저장 금액 불일치 → 확정 금지(이상 징후)
      return 'amount_mismatch'
    }
    // 경합 시 이미 확정된 결제를 덮지 않도록 pending일 때만 갱신
    await supabase
      .from('payments')
      .update({ status: 'confirmed', payment_key: authoritative.paymentKey })
      .eq('order_id', payment.order_id)
      .eq('status', 'pending')
    // 어느 경로로 확정되든 목표 달성 시 자동 마감되도록 동일 헬퍼 호출
    await closeFundingIfTargetReached(supabase, payment.funding_id)
    return 'confirmed'
  }

  if (
    authoritative.status === 'CANCELED' ||
    authoritative.status === 'EXPIRED' ||
    authoritative.status === 'ABORTED'
  ) {
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('order_id', payment.order_id)
      .eq('status', 'pending')
    return 'failed'
  }

  // READY/IN_PROGRESS/WAITING_FOR_DEPOSIT 등 비최종 상태 → 아직 반영할 것 없음
  return 'noop'
}

function tossAuthHeader() {
  return `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`
}

// orderId만 알 때(브라우저가 paymentKey를 못 준 경우: 결제창 실패, 미확정 방치 등)
// 토스에 orderId로 실제 결제를 조회한 뒤 reconcilePayment로 보정한다.
export async function reconcileOrderId(
  supabase: ServiceClient,
  orderId: string
): Promise<ReconcileResult> {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (!payment) return 'noop'
  if (payment.status === 'confirmed') return 'noop'

  let res: Response
  try {
    res = await fetch(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: tossAuthHeader() },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return 'error' // 일시적 네트워크/타임아웃 → 상태 변경 없이 다음 기회에 재시도
  }

  if (res.status === 404) {
    // 토스에 결제 자체가 없음 = 결제창까지 갔다가 완료하지 않음 → 실패로 정리
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('order_id', orderId)
      .eq('status', 'pending')
    return 'failed'
  }

  if (!res.ok) return 'error'

  const data = (await res.json().catch(() => null)) as
    | { status?: string; totalAmount?: number; paymentKey?: string }
    | null
  if (!data?.status || !data.paymentKey) return 'error'

  return reconcilePayment(supabase, payment as PaymentRow, {
    status: data.status,
    totalAmount: data.totalAmount,
    paymentKey: data.paymentKey,
  })
}
