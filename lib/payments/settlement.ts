import type { createServiceClient } from '@/lib/supabase/server'

type ServiceClient = ReturnType<typeof createServiceClient>

// 목표금액을 달성한 진행중 펀딩을 자동으로 마감(closed)한다.
// 결제 확정이 일어나는 모든 경로(브라우저 confirm, 웹훅, 복구 배치)에서 동일하게 호출해
// "어느 경로로 확정되든 목표 달성 시 마감된다"는 동작을 일관되게 유지한다.
export async function closeFundingIfTargetReached(
  supabase: ServiceClient,
  fundingId: string
): Promise<void> {
  const [{ data: confirmedPayments }, { data: gifts }, { data: funding }] = await Promise.all([
    supabase.from('payments').select('amount').eq('funding_id', fundingId).eq('status', 'confirmed'),
    supabase.from('gifts').select('target_amount').eq('funding_id', fundingId),
    supabase.from('fundings').select('status').eq('id', fundingId).single(),
  ])

  // 진행중일 때만 자동 마감한다. 이미 마감/정산완료면 손대지 않는다.
  if (funding?.status !== 'active') return

  const totalPaid = (confirmedPayments ?? []).reduce((sum, p) => sum + p.amount, 0)
  const totalTarget = (gifts ?? []).reduce((sum, g) => sum + g.target_amount, 0)

  if (totalTarget > 0 && totalPaid >= totalTarget) {
    await supabase.from('fundings').update({ status: 'closed' }).eq('id', fundingId)
  }
}
