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
    await supabase.from('payments').update({ status: 'failed' }).eq('order_id', orderId)
    return NextResponse.json(
      { error: (tossError as { message?: string }).message || '토스페이먼츠 확인 실패' },
      { status: 400 }
    )
  }

  await supabase
    .from('payments')
    .update({ status: 'confirmed', payment_key: paymentKey })
    .eq('order_id', orderId)

  return NextResponse.json({ success: true })
}
