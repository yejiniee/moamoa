import ProgressBar from '@/components/ui/ProgressBar'
import { formatKRW, calcPercent } from '@/lib/utils'
import type { Gift } from '@/lib/supabase/types'

type Props = {
  gifts: Gift[]
  totalRaised: number
}

export default function GiftList({ gifts, totalRaised }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">선물 목록</h2>
      <div className="space-y-2">
        {gifts.map((gift) => {
          const percent = calcPercent(totalRaised, gift.target_amount)
          return (
            <div
              key={gift.id}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{gift.name}</p>
                  {gift.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{gift.description}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-rose-500 ml-3 shrink-0">
                  {percent}%
                </span>
              </div>
              <ProgressBar percent={percent} size="sm" />
              <p className="text-xs text-gray-500">{formatKRW(gift.target_amount)} 목표</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
