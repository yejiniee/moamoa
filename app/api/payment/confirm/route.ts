import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  const { paymentKey, orderId, amount } = body
  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: payment, error: findError } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (findError || !payment) {
    return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다' }, { status: 404 })
  }

  if (payment.status === 'confirmed') {
    return NextResponse.json({ success: true })
  }

  if (payment.status === 'failed') {
    return NextResponse.json({ error: '이미 실패한 결제입니다' }, { status: 400 })
  }

  if (payment.amount !== Number(amount)) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않습니다' }, { status: 400 })
  }

  const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
  })

  if (!tossResponse.ok) {
    const tossError = await tossResponse.json().catch(() => ({}))

    // 동시 확인 요청(예: StrictMode 이중 호출, 다중 탭)으로 다른 요청이 이미
    // 결제를 확정했을 수 있다. 실제 상태를 다시 확인해서, 이미 confirmed면
    // 실패로 덮어쓰지 않고 성공으로 응답한다.
    const { data: latest } = await supabase
      .from('payments')
      .select('status')
      .eq('order_id', orderId)
      .single()

    if (latest?.status === 'confirmed') {
      return NextResponse.json({ success: true })
    }

    // 아직 확정되지 않은(pending) 결제만 실패로 표시한다. confirmed는 절대 덮어쓰지 않는다.
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('order_id', orderId)
      .eq('status', 'pending')

    return NextResponse.json(
      { error: (tossError as { message?: string }).message || '토스페이먼츠 확인 실패' },
      { status: 400 }
    )
  }

  await supabase
    .from('payments')
    .update({ status: 'confirmed', payment_key: paymentKey })
    .eq('order_id', orderId)

  // 목표금액 달성 시 자동 정산
  const [{ data: allPayments }, { data: gifts }, { data: funding }] = await Promise.all([
    supabase.from('payments').select('amount').eq('funding_id', payment.funding_id).eq('status', 'confirmed'),
    supabase.from('gifts').select('target_amount').eq('funding_id', payment.funding_id),
    supabase.from('fundings').select('status').eq('id', payment.funding_id).single(),
  ])

  if (funding?.status === 'active') {
    const totalPaid = (allPayments ?? []).reduce((sum, p) => sum + p.amount, 0)
    const totalTarget = (gifts ?? []).reduce((sum, g) => sum + g.target_amount, 0)
    if (totalTarget > 0 && totalPaid >= totalTarget) {
      await supabase.from('fundings').update({ status: 'closed' }).eq('id', payment.funding_id)
    }
  }

  return NextResponse.json({ success: true })
}
