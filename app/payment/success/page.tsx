import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import SuccessClient from './SuccessClient'
import Header from '@/components/ui/Header'

type SearchParams = { paymentKey?: string; orderId?: string; amount?: string }

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const { paymentKey, orderId, amount } = searchParams
  if (!paymentKey || !orderId || !amount) notFound()

  const supabase = createServiceClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (!payment) notFound()

  const { data: funding } = await supabase
    .from('fundings')
    .select('id, title, share_token')
    .eq('id', payment.funding_id)
    .single()

  if (!funding) notFound()

  const { data: confirmedPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('funding_id', funding.id)
    .eq('status', 'confirmed')

  const { data: gifts } = await supabase
    .from('gifts')
    .select('target_amount')
    .eq('funding_id', funding.id)

  const totalAmount = (confirmedPayments ?? []).reduce((s, p) => s + p.amount, 0)
  const totalTarget = (gifts ?? []).reduce((s, g) => s + g.target_amount, 0)

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <SuccessClient
          paymentKey={paymentKey}
          orderId={orderId}
          amount={Number(amount)}
          fundingToken={funding.share_token}
          fundingTitle={funding.title}
          participantName={payment.participant_name}
          totalAmount={totalAmount}
          totalTarget={totalTarget}
        />
      </div>
      </main>
    </>
  )
}
