'use client'

import { useState } from 'react'
import Toast from '@/components/ui/Toast'

type Props = {
  shareToken: string
  title: string
  description?: string | null
  /** 'button' = 라벨 있는 전체 너비 버튼(생성 완료 화면), 'icon' = 아이콘만(상세 페이지 헤더) */
  variant?: 'button' | 'icon'
}

export default function ShareButton({
  shareToken,
  title,
  description,
  variant = 'button',
}: Props) {
  const [toast, setToast] = useState<string | null>(null)

  const handleShare = async () => {
    const url = `${window.location.origin}/funding/${shareToken}`

    // 앱/OS 기본 공유 시트 (iOS/Android, 데스크톱 Chrome·Edge·Safari 지원)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: description || title, url })
        return
      } catch (e) {
        // 사용자가 공유 시트를 닫은 경우(AbortError)는 조용히 종료
        if (e instanceof Error && e.name === 'AbortError') return
        // 그 외 오류는 아래 폴백으로 진행
      }
    }

    // 기본 공유를 지원하지 않는 브라우저(예: 데스크톱 Firefox) 폴백
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setToast('링크를 복사했어요')
    } catch {
      setToast('공유에 실패했어요')
    }
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={handleShare}
          aria-label="공유하기"
          className="text-gray-500 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
        >
          <ShareIcon />
        </button>
        <Toast message={toast} onDismiss={() => setToast(null)} />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="h-[52px] rounded-[14px] bg-rose-500 text-white text-[16px] font-semibold hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
      >
        <ShareIcon />
        공유하기
      </button>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  )
}

function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
