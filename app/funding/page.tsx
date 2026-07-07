import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FundingCard from '@/components/funding/FundingCard'
import Button from '@/components/ui/Button'
import Header from '@/components/ui/Header'

export default async function FundingFeedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: fundings } = await supabase
    .from('fundings')
    .select('*')
    .eq('creator_user_id', user?.id ?? '')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  // 각 펀딩의 총 모금액 + 목표 금액 조회
  const fundingIds = (fundings ?? []).map((f) => f.id)

  const [{ data: allPayments }, { data: allGifts }] = await Promise.all([
    fundingIds.length > 0
      ? supabase.from('payments').select('funding_id, amount').in('funding_id', fundingIds).eq('status', 'confirmed')
      : Promise.resolve({ data: [] }),
    fundingIds.length > 0
      ? supabase.from('gifts').select('funding_id, target_amount').in('funding_id', fundingIds)
      : Promise.resolve({ data: [] }),
  ])

  const raisedMap: Record<string, number> = {}
  for (const p of allPayments ?? []) {
    raisedMap[p.funding_id] = (raisedMap[p.funding_id] ?? 0) + p.amount
  }

  const targetMap: Record<string, number> = {}
  for (const g of allGifts ?? []) {
    targetMap[g.funding_id] = (targetMap[g.funding_id] ?? 0) + g.target_amount
  }

  const list = fundings ?? []

  return (
    <>
      <Header backHref="/" />
      <main className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">내 펀딩</h1>
        <Link href="/create">
          <Button fullWidth={false} size="medium">+ 새 펀딩</Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🎁</div>
          <p className="text-sm">아직 만든 펀딩이 없어요</p>
          <Link href="/create" className="mt-4 inline-block text-sm text-rose-500 hover:underline">
            첫 펀딩 만들기 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((funding, index) => (
            <FundingCard
              key={funding.id}
              funding={funding}
              totalRaised={raisedMap[funding.id] ?? 0}
              totalTarget={targetMap[funding.id] ?? 0}
              priority={index < 2}
            />
          ))}
        </div>
      )}
      </main>
    </>
  )
}
