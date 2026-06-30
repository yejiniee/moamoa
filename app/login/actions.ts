'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function signIn(
  email: string,
  password: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: '이메일 또는 비밀번호가 올바르지 않습니다' }
  return { success: true }
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
}
