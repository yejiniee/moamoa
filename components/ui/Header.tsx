'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/app/login/actions'

type Props = {
  backHref?: string
  right?: React.ReactNode
}

export default function Header({ backHref, right }: Props) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
      router.push('/')
      router.refresh()
    })
  }

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="px-4 h-14 flex items-center justify-between">
        {backHref ? (
          <Link href={backHref} className="text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft />
          </Link>
        ) : (
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft />
          </button>
        )}

        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 hover:opacity-80 transition-opacity"
        >
          <Image src="/images/logo.svg" alt="모아모아" width={80} height={28} priority />
        </Link>

        {(right || isLoggedIn) && (
          <div className="flex items-center gap-2">
            {right}
            {isLoggedIn && (
              <button
                onClick={handleSignOut}
                disabled={isPending}
                className="text-sm text-gray-400 hover:underline disabled:opacity-40"
              >
                로그아웃
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
