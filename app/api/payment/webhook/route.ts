import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

  if (authoritative.status === 'DONE') {
    if (payment.status === 'confirmed') {
      return NextResponse.json({ ok: true }) // 이미 반영됨(멱등)
    }
    if (authoritative.totalAmount !== payment.amount) {
      // 조회 금액과 저장 금액 불일치 → 확정하지 않음(이상 징후)
      return NextResponse.json({ error: '결제 금액이 일치하지 않습니다' }, { status: 400 })
    }
    // 경합 시 다른 요청이 이미 확정한 결제를 덮지 않도록 pending일 때만 갱신한다.
    await supabase
      .from('payments')
      .update({ status: 'confirmed', payment_key: paymentKey })
      .eq('order_id', orderId)
      .eq('status', 'pending')
    return NextResponse.json({ ok: true })
  }

  if (
    authoritative.status === 'CANCELED' ||
    authoritative.status === 'EXPIRED' ||
    authoritative.status === 'ABORTED'
  ) {
    // 아직 확정되지 않은 결제만 실패로 정리한다(confirmed는 건드리지 않음).
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('order_id', orderId)
      .eq('status', 'pending')
    return NextResponse.json({ ok: true })
  }

  // READY/IN_PROGRESS/WAITING_FOR_DEPOSIT 등 비최종 상태 → 아직 반영할 것 없음
  return NextResponse.json({ ok: true })
}
