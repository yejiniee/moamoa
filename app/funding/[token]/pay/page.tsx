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

  if (!funding || funding.status === 'closed') notFound()

  return <PayClient fundingId={funding.id} fundingTitle={funding.title} />
}
