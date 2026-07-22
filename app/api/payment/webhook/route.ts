import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { reconcilePayment, type PaymentRow } from '@/lib/payments/reconcile'

// 토스가 결제 상태 변경을 서버로 통지하는 웹훅(PAYMENT_STATUS_CHANGED).
//
// 존재 이유: 브라우저의 /api/payment/confirm 호출이 중간에 끊겨도(결제 직후 창 닫힘,
// 네트워크 단절 등) 이 경로로 결제 상태를 실제 값으로 보정한다. 브라우저 confirm이
// 유일한 확정 경로일 때 발생하던 "토스는 승인, DB는 pending" 불일치의 안전망이다.
//
// 보안: 웹훅 본문은 신뢰하지 않는다. 누구나 이 엔드포인트로 위조 본문을 보낼 수 있으므로,
// paymentKey로 토스 조회 API를 다시 호출해(시크릿 키 사용) 실제 상태·금액을 확인한 뒤에만
// DB를 갱신한다.
//
// 참고: 목표금액 달성 시 자동 정산(마감)은 일반 경로인 confirm 라우트가 담당한다.
// 이 웹훅은 상태 보정(pending → confirmed/failed)에만 집중한다.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const paymentKey: string | undefined = body?.data?.paymentKey ?? body?.paymentKey
  const orderId: string | undefined = body?.data?.orderId ?? body?.orderId
  if (!paymentKey || !orderId) {
    return NextResponse.json({ error: '잘못된 웹훅 요청' }, { status: 400 })
  }

  // 실제 결제 상태를 토스에서 재확인(위조 웹훅 방지)
  let lookup: Response
  try {
    lookup = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    // 토스 조회 실패(일시적 네트워크/타임아웃) → 5xx로 응답해 토스가 재시도하게 한다.
    return NextResponse.json({ error: '결제 상태 조회 실패' }, { status: 502 })
  }

  if (!lookup.ok) {
    // 유효하지 않은 paymentKey(위조 가능성 포함) → 상태 변경 없이 거절
    return NextResponse.json({ error: '유효하지 않은 결제 정보' }, { status: 400 })
  }

  const authoritative = (await lookup.json().catch(() => null)) as
    | { orderId?: string; status?: string; totalAmount?: number }
    | null
  if (!authoritative?.status) {
    return NextResponse.json({ error: '결제 상태 조회 실패' }, { status: 502 })
  }

  const supabase = createServiceClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (!payment) {
    return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다' }, { status: 404 })
  }

  // 웹훅/복구 배치와 공유하는 단일 결정 로직으로 보정한다.
  const result = await reconcilePayment(supabase, payment as PaymentRow, {
    status: authoritative.status,
    totalAmount: authoritative.totalAmount,
    paymentKey,
  })

  if (result === 'amount_mismatch') {
    return NextResponse.json({ error: '결제 금액이 일치하지 않습니다' }, { status: 400 })
  }

  // confirmed/failed/noop 모두 정상 처리로 간주(토스가 재시도하지 않도록 200)
  return NextResponse.json({ ok: true })
}
