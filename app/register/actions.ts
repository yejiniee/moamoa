'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

type SuccessResult = { success: true }
type ErrorResult = { error: string }
type AuthResult = SuccessResult | ErrorResult

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    if (error.message.includes('already registered')) return { error: '이미 가입된 이메일입니다' } as ErrorResult
    return { error: error.message } as ErrorResult
  }
  return { success: true } as SuccessResult
}

export async function verifySignUpOtp(email: string, otp: string): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup',
  })
  if (error) return { error: '인증 코드가 올바르지 않거나 만료되었습니다' } as ErrorResult
  return { success: true } as SuccessResult
}
