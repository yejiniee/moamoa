import { notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import EditClient from './EditClient'

export default async function EditPage({ params }: { params: { token: string } }) {
  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) notFound()

  const supabase = createServiceClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('*')
    .eq('share_token', params.token)
    .single()

  if (!funding || funding.creator_user_id !== user.id) notFound()

  const { data: gifts } = await supabase
    .from('gifts')
    .select('*')
    .eq('funding_id', funding.id)
    .order('created_at')

  const gift = gifts?.[0]
  if (!gift) notFound()

  return (
    <EditClient
      token={params.token}
      funding={funding}
      gift={gift}
    />
  )
}
