import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FundingRealtime from './FundingRealtime'
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

  const [{ data: funding }, { data: { user } }] = await Promise.all([
    supabase.from('fundings').select('*').eq('share_token', params.token).single(),
    supabase.auth.getUser(),
  ])

  if (!funding) notFound()

  const isOwner = !!user && user.id === funding.creator_user_id

  const [{ data: gifts }, { data: payments }] = await Promise.all([
    supabase.from('gifts').select('*').eq('funding_id', funding.id).order('created_at'),
    supabase
      .from('payments')
      .select('*')
      .eq('funding_id', funding.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false }),
  ])

  const dday = calcDday(funding.end_date)
  const isClosed = funding.status === 'closed'

  return (
    <>
      {/* TDS Top — 상단 네비게이션 */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/funding" className="text-gray-500 hover:text-gray-800 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            {isClosed && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                마감
              </span>
            )}
            {isOwner && (
              <Link
                href={`/funding/${params.token}/admin`}
                className="text-xs font-medium text-gray-500 hover:text-rose-500 bg-gray-100 hover:bg-rose-50 px-3 py-1 rounded-full transition-colors"
              >
                관리
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-32">
        {/* TDS Paragraph — 제목 영역 */}
        <div className="px-5 pt-6 pb-4">
          <span className="inline-block text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full mb-3">
            {dday}
          </span>
          <h1 className="text-[22px] font-bold text-[#191F28] leading-snug">
            {funding.title}
          </h1>
          {funding.description && (
            <p className="mt-2 text-[14px] text-gray-500 leading-relaxed">
              {funding.description}
            </p>
          )}
        </div>

        {/* TDS Card — 대표 이미지 (제목 아래, 카드형) */}
        <div className="px-5">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
            {funding.image_url ? (
              <Image
                src={funding.image_url}
                alt={funding.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
                <span className="text-5xl">🎂</span>
              </div>
            )}
          </div>
        </div>

        {/* 달성률 / 선물 목록 / 후원자 롤링 */}
        <div className="px-5 pt-6">
          <FundingRealtime
            fundingId={funding.id}
            gifts={gifts ?? []}
            initialPayments={payments ?? []}
            isOwner={isOwner}
          />
        </div>
      </main>

      {/* TDS BottomCTA — 하단 고정 버튼 */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100">
          <div className="max-w-md mx-auto px-5 py-4">
            <Link href={`/funding/${params.token}/pay`}>
              <Button>선물하기 🎁</Button>
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
