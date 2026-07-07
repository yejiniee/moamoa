'use client'

import { useEffect, useRef, useState } from 'react'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatKRW, calcPercent } from '@/lib/utils'

type Props = {
  totalRaised: number
  totalGoal: number
}

const ANIMATION_MS = 800

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let frameId: number

    const tick = (now: number) => {
      const progress = Math.min((now - start) / ANIMATION_MS, 1)
      const eased = easeOutCubic(progress)
      setValue(from + (target - from) * eased)
      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [target])

  return value
}

export default function FundingProgress({ totalRaised, totalGoal }: Props) {
  const percent = calcPercent(totalRaised, totalGoal)
  const animatedPercent = useAnimatedNumber(percent)

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-2xl font-bold text-rose-500">{Math.round(animatedPercent)}%</span>
        <span className="text-sm text-gray-500">
          {formatKRW(totalGoal)} 목표
        </span>
      </div>
      <ProgressBar percent={animatedPercent} size="md" />
      <p className="text-sm text-gray-700">
        <span className="font-semibold text-gray-900">
          {formatKRW(totalRaised)}
        </span>
      </p>
    </div>
  )
}
