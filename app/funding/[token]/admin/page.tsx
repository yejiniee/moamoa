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

  const [{ data: payments }, { data: gifts }] = await Promise.all([
    supabase
      .from('payments')
      .select('*')
      .eq('funding_id', funding.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false }),
    supabase.from('gifts').select('*').eq('funding_id', funding.id),
  ])

  const totalAmount = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)
  const totalTarget = (gifts ?? []).reduce((sum, g) => sum + g.target_amount, 0)
  const goalReached = totalTarget > 0 && totalAmount >= totalTarget

  return (
    <AdminClient
      funding={funding}
      payments={payments ?? []}
      totalAmount={totalAmount}
      goalReached={goalReached}
    />
  )
}
