import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { reconcileOrderId, type ReconcileResult } from '@/lib/payments/reconcile'

// 이 시간(분) 이상 pending으로 남은 결제만 대상으로 삼는다.
// 방금 시작된 정상 결제(확정 진행 중)와 경쟁하지 않도록 여유를 둔다.
const STALE_MINUTES = 15

// 미확정(pending) 상태로 오래 방치된 결제를 토스에 실제 상태를 물어 일괄 보정하는 배치.
// 웹훅이 유실됐거나 브라우저 confirm이 끊긴 경우의 최종 안전망이다.
//
// 크론(예: Vercel Cron)이 주기적으로 호출한다. 아무나 부르지 못하도록
// CRON_SECRET을 Bearer 토큰으로 요구한다.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString()

  const { data: stale } = await supabase
    .from('payments')
    .select('order_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)

  const tally: Record<ReconcileResult, number> = {
    confirmed: 0,
    failed: 0,
    amount_mismatch: 0,
    noop: 0,
    error: 0,
  }

  for (const p of stale ?? []) {
    const result = await reconcileOrderId(supabase, p.order_id)
    tally[result] += 1
  }

  return NextResponse.json({ processed: (stale ?? []).length, ...tally })
}
