import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FundingProgress from '@/components/funding/FundingProgress'
import GiftList from '@/components/funding/GiftList'
import DonorList from '@/components/funding/DonorList'
import Button from '@/components/ui/Button'

function calcDday(endDate: string): string {
  const end = new Date(endDate)
  const now = new Date()
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return '마감'
  if (diffDays === 0) return 'D-day'
  return `D-${diffDays}`
}

export default async function FundingPage({
  params,
}: {
  params: { token: string }
}) {
  const supabase = await createClient()

  const { data: funding, error: fundingError } = await supabase
    .from('fundings')
    .select('*')
    .eq('share_token', params.token)
    .single()

  if (!funding) notFound()

  const [{ data: gifts }, { data: payments }] = await Promise.all([
    supabase
      .from('gifts')
      .select('*')
      .eq('funding_id', funding.id)
      .order('created_at'),
    supabase
      .from('payments')
      .select('*')
      .eq('funding_id', funding.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false }),
  ])

  const giftList = gifts ?? []
  const paymentList = payments ?? []

  const totalGoal = giftList.reduce((sum, g) => sum + g.target_amount, 0)
  const totalRaised = paymentList.reduce((sum, p) => sum + p.amount, 0)

  const dday = calcDday(funding.end_date)
  const isClosed = funding.status === 'closed'

  return (
    <main className="max-w-md mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-rose-500">{dday}</span>
          {isClosed && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              마감된 펀딩
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{funding.title}</h1>
        {funding.description && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{funding.description}</p>
        )}
      </div>

      {/* 전체 달성률 */}
      <FundingProgress totalRaised={totalRaised} totalGoal={totalGoal} />

      {/* 선물 목록 */}
      {giftList.length > 0 && (
        <GiftList gifts={giftList} totalRaised={totalRaised} />
      )}

      {/* 후원자 목록 */}
      {paymentList.length > 0 && (
        <DonorList payments={paymentList} />
      )}

      {/* 선물하기 버튼 */}
      {!isClosed && (
        <div className="pt-2">
          <Link href={`/funding/${params.token}/pay`}>
            <Button>선물하기 🎁</Button>
          </Link>
        </div>
      )}
    </main>
  )
}
