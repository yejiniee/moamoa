'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { reconcileOrderId } from '@/lib/payments/reconcile'

// 결제창에서 실패/취소되어 failUrl로 돌아온 결제를 정리한다.
// 토스에 실제 상태를 다시 물어(reconcileOrderId) 확인하므로,
// 혹시 실제로는 성공한 결제를 잘못 실패 처리하는 일이 없다.
// (성공했다면 confirmed로, 취소/미완료면 failed로 보정된다.)
export async function reconcileFailedOrder(orderId: string): Promise<void> {
  if (!orderId) return
  const supabase = createServiceClient()
  await reconcileOrderId(supabase, orderId)
}
