'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

type SuccessResult = { success: true }
type ErrorResult = { error: string }
type AuthResult = SuccessResult | ErrorResult

export async function sendSignUpOtp(email: string): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) return { error: error.message } as ErrorResult
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
  if (updateError) return { error: updateError.message } as ErrorResult

  return { success: true } as SuccessResult
}
