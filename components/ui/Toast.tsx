'use client'

import { useEffect, useRef, useState } from 'react'

type ToastProps = {
  message: string | null
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onDismiss, duration = 2000 }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!message) return

    // 초기 opacity-0로 마운트한 뒤 다음 프레임에 fade-in
    const raf = requestAnimationFrame(() => setVisible(true))
    const hideId = setTimeout(() => setVisible(false), duration)
    // fade-out(200ms) 이후 부모에 알려 message를 비운다
    const dismissId = setTimeout(() => onDismissRef.current(), duration + 200)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(hideId)
      clearTimeout(dismissId)
    }
  }, [message, duration])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-gray-900/90 text-white text-sm font-medium shadow-lg transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {message}
    </div>
  )
}
