import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import PayClient from './PayClient'

export default async function PayPage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient()
  const { data: funding } = await supabase
    .from('fundings')
    .select('id, title, status')
    .eq('share_token', params.token)
    .single()

  // 진행중(active)이 아닌 펀딩(마감/정산완료)은 결제를 받지 않는다
  if (!funding || funding.status !== 'active') notFound()

  return <PayClient fundingId={funding.id} fundingTitle={funding.title} />
}
