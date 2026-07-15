import { notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage({ params }: { params: { token: string } }) {
  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()

  // 미들웨어가 처리하지만 이중 방어
  if (!user) notFound()

  const supabase = createServiceClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('*')
    .eq('share_token', params.token)
    .single()

  // 펀딩 없거나 본인 펀딩이 아니면 404
  if (!funding || funding.creator_user_id !== user.id) notFound()

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('funding_id', funding.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  const totalAmount = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)

  // 정산 완료된 펀딩의 기록된 계좌(소유자 전용 settlements 테이블)
  const { data: settlement } = await supabase
    .from('settlements')
    .select('bank_name, account_number, account_holder')
    .eq('funding_id', funding.id)
    .maybeSingle()

  const settledBank = settlement
    ? {
        bankName: settlement.bank_name,
        accountNumber: settlement.account_number,
        accountHolder: settlement.account_holder,
      }
    : undefined

  const { data: profile } = await serverClient
    .from('profiles')
    .select('bank_name, account_number, account_holder')
    .eq('user_id', user.id)
    .maybeSingle()

  const defaultBank = profile
    ? {
        bankName: profile.bank_name ?? '',
        accountNumber: profile.account_number ?? '',
        accountHolder: profile.account_holder ?? '',
      }
    : undefined

  return (
    <AdminClient
      funding={funding}
      payments={payments ?? []}
      totalAmount={totalAmount}
      defaultBank={defaultBank}
      settledBank={settledBank}
    />
  )
}
