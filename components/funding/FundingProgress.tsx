import ProgressBar from '@/components/ui/ProgressBar'
import { formatKRW, calcPercent } from '@/lib/utils'

type Props = {
  totalRaised: number
  totalGoal: number
}

export default function FundingProgress({ totalRaised, totalGoal }: Props) {
  const percent = calcPercent(totalRaised, totalGoal)

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-2xl font-bold text-rose-500">{percent}%</span>
        <span className="text-sm text-gray-500">{formatKRW(totalGoal)} 목표</span>
      </div>
      <ProgressBar percent={percent} size="md" />
      <p className="text-sm text-gray-700">
        <span className="font-semibold text-gray-900">{formatKRW(totalRaised)}</span> 모임
      </p>
    </div>
  )
}
