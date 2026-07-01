import { notFound } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import Header from '@/components/ui/Header'
import ProgressBar from '@/components/ui/ProgressBar'

function calcDday(endDate: string): string {
  const end = new Date(endDate)
  const now = new Date()
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return '마감'
  if (diffDays === 0) return 'D-day'
  return `D-${diffDays}`
}

export default async function MyFundingPage() {
  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) notFound()

  const supabase = createServiceClient()

  const { data: fundings } = await supabase
    .from('fundings')
    .select('*')
    .eq('creator_user_id', user.id)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <>
      <Header backHref="/" />
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">나의 펀딩</h1>
          <Link href="/create">
            <Button fullWidth={false} size="medium">+ 새 펀딩</Button>
          </Link>
        </div>

        {(!fundings || fundings.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <span className="text-5xl">🎂</span>
            <p className="text-sm">아직 만든 펀딩이 없어요</p>
            <Link href="/create" className="text-sm text-rose-500 font-semibold hover:underline">
              펀딩 만들기 →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {fundings.map((funding) => (
              <MyFundingCard key={funding.id} funding={funding} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}

async function MyFundingCard({ funding }: { funding: { id: string; title: string; description: string | null; end_date: string; status: string; share_token: string } }) {
  const supabase = createServiceClient()

  const [{ data: payments }, { data: gifts }] = await Promise.all([
    supabase.from('payments').select('amount').eq('funding_id', funding.id).eq('status', 'confirmed'),
    supabase.from('gifts').select('target_amount').eq('funding_id', funding.id),
  ])

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)
  const totalTarget = (gifts ?? []).reduce((sum, g) => sum + g.target_amount, 0)
  const percent = totalTarget > 0 ? Math.min(Math.round((totalPaid / totalTarget) * 100), 100) : 0
  const dday = calcDday(funding.end_date)
  const isClosed = funding.status === 'closed'

  return (
    <Link
      href={`/funding/${funding.share_token}`}
      className={`block bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow ${isClosed ? 'opacity-50 grayscale' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{funding.title}</p>
          {funding.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{funding.description}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
          isClosed
            ? 'bg-gray-100 text-gray-400'
            : 'bg-rose-50 text-rose-500'
        }`}>
          {isClosed ? '종료' : dday}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <ProgressBar percent={percent} />
        <p className="text-xs text-gray-400 text-right">{percent}% 달성</p>
      </div>
    </Link>
  )
}
