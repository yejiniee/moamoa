import Link from 'next/link'
import Image from 'next/image'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatKRW, calcPercent } from '@/lib/utils'
import type { Funding } from '@/lib/supabase/types'

type Props = {
  funding: Funding
  totalRaised: number
  totalTarget: number
  priority?: boolean
}

function calcDday(endDate: string): string {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return '마감'
  if (diff === 0) return 'D-day'
  return `D-${diff}`
}

export default function FundingCard({ funding, totalRaised, totalTarget, priority = false }: Props) {
  const percent = calcPercent(totalRaised, totalTarget)
  const dday = calcDday(funding.end_date)
  const isClosed = funding.status === 'closed'

  return (
    <Link href={`/funding/${funding.share_token}`} className="block">
      <div className={`bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${isClosed ? 'opacity-50 grayscale' : ''}`}>
        <div className="relative h-40 bg-gray-100">
          {funding.image_url ? (
            <Image src={funding.image_url} alt={funding.title} fill sizes="(min-width: 430px) 215px, 50vw" className="object-cover" priority={priority} />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <Image src="/images/ic-birthday-cake.svg" alt="기본 이미지" width={72} height={72} style={{ filter: 'brightness(0) invert(78%)' }} />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              isClosed
                ? 'bg-gray-200 text-gray-500'
                : 'bg-rose-100 text-rose-600'
            }`}>
              {isClosed ? '종료' : dday}
            </span>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-2">
          <h2 className="font-semibold text-gray-900 text-sm line-clamp-1">{funding.title}</h2>
          <ProgressBar percent={percent} />
          <div className="flex justify-between text-xs text-gray-500">
            <span className="text-rose-500 font-semibold">{percent}% 달성</span>
            <span>{formatKRW(totalRaised)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
