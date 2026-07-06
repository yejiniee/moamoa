'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AuthError } from '@supabase/supabase-js'

type SuccessResult = { success: true }
type ErrorResult = { error: string; code?: 'EMAIL_SEND_FAILED' }
type AuthResult = SuccessResult | ErrorResult

function toFriendlyError(error: AuthError): ErrorResult {
  if (error.name === 'AuthRetryableFetchError' || error.status === 500) {
    return { error: '이메일 전송에 실패했어요', code: 'EMAIL_SEND_FAILED' }
  }
  if (!error.message || error.message === '{}') {
    return { error: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해주세요' }
  }
  return { error: error.message }
}

async function isEmailRegistered(email: string): Promise<boolean> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: 'no-store',
    }
  )
  if (!res.ok) return false
  const data: { users?: { email?: string }[] } = await res.json()
  return (data.users ?? []).some((u) => u.email?.toLowerCase() === email.toLowerCase())
}

export async function sendSignUpOtp(email: string): Promise<AuthResult> {
  if (await isEmailRegistered(email)) {
    return { error: '이미 가입된 이메일이에요.' } as ErrorResult
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) return toFriendlyError(error)
  return { success: true } as SuccessResult
}

export async function verifyOtpAndSetPassword(
  email: string,
  otp: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  })
  if (verifyError) return { error: '인증 코드가 올바르지 않거나 만료되었습니다' } as ErrorResult

  const { error: updateError } = await supabase.auth.updateUser({ password })
  if (updateError) return toFriendlyError(updateError)

  return { success: true } as SuccessResult
}
