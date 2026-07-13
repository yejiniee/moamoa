'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

type Props = {
  paymentKey: string
  orderId: string
  amount: number
  fundingToken: string
  fundingTitle: string
  participantName: string
  totalAmount: number
  totalTarget: number
}

export default function SuccessClient(props: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [showKakao, setShowKakao] = useState(false)
  const confirmRequested = useRef(false)

  useEffect(() => {
    // StrictMode의 이중 실행이나 리마운트로 confirm이 중복 호출되면
    // 토스가 두 번째 요청을 "이미 처리중인 요청입니다"로 거부하므로 한 번만 보낸다
    if (confirmRequested.current) return
    confirmRequested.current = true

    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey: props.paymentKey,
        orderId: props.orderId,
        amount: props.amount,
      }),
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; error?: string }) => {
        if (data.success) {
          setConfirmed(true)
          setShowKakao(true)
        } else {
          setError(data.error || '결제 확인 실패')
        }
      })
      .catch(() => setError('네트워크 오류가 발생했습니다'))
  }, [props.paymentKey, props.orderId, props.amount])

  const handleKakaoShare = () => {
    const percent =
      props.totalTarget > 0
        ? Math.min(Math.round(((props.totalAmount + props.amount) / props.totalTarget) * 100), 100)
        : 0
    const url = `${window.location.origin}/funding/${props.fundingToken}`

    window.Kakao?.Share?.sendDefault({
      objectType: 'feed',
      content: {
        title: `${props.participantName}님이 펀딩에 참여했어요! 🎂`,
        description: `${props.fundingTitle} — 현재 ${percent}% 달성`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: '펀딩 보러가기', link: { mobileWebUrl: url, webUrl: url } }],
    })
    setShowKakao(false)
  }

  if (error) {
    return (
      <div className="text-center flex flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <Link href={`/funding/${props.fundingToken}`}>
          <Button variant="outline">펀딩 페이지로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  if (!confirmed) {
    return <p className="text-gray-500 text-center animate-pulse">결제 확인 중...</p>
  }

  return (
    <div className="text-center flex flex-col gap-4">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-bold">결제가 완료됐어요!</h1>
      <p className="text-gray-500 text-sm">소중한 마음이 전달되었습니다</p>

      {showKakao && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-yellow-800">주최자에게 알릴까요? 😊</p>
          <button
            className="bg-[#FEE500] text-[#3C1E1E] font-semibold py-2 px-4 rounded-lg text-sm hover:bg-yellow-400 transition-colors"
            onClick={handleKakaoShare}
          >
            카카오톡으로 알리기
          </button>
          <button
            className="text-xs text-gray-400 hover:underline"
            onClick={() => setShowKakao(false)}
          >
            괜찮아요, 그냥 넘어갈게요
          </button>
        </div>
      )}

      <Link href={`/funding/${props.fundingToken}`}>
        <Button>펀딩 현황 보러가기</Button>
      </Link>
    </div>
  )
}
