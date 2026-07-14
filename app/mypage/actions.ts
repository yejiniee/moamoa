'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ActionResult = { success: true } | { error: string }

type BankInput = {
  bankName: string
  accountNumber: string
  accountHolder: string
}

// 계좌 등록/변경: 본인 profiles 행에 기본 계좌를 upsert한다.
export async function updateBankAccount(bank: BankInput): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const bankName = bank.bankName?.trim()
  const accountNumber = bank.accountNumber?.trim()
  const accountHolder = bank.accountHolder?.trim()
  if (!bankName || !accountNumber || !accountHolder) {
    return { error: '계좌 정보를 모두 입력해주세요' }
  }

  const { error } = await supabase.from('profiles').upsert({
    user_id: user.id,
    bank_name: bankName,
    account_number: accountNumber,
    account_holder: accountHolder,
    updated_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }

  revalidatePath('/mypage')
  return { success: true as const }
}

// 비밀번호 바꾸기: 현재 로그인 세션으로 새 비밀번호를 설정한다.
export async function changePassword(newPassword: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  if (!newPassword || newPassword.length < 8) {
    return { error: '비밀번호는 8자 이상이어야 합니다' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    if (error.message?.includes('should be different')) {
      return { error: '기존 비밀번호와 다른 비밀번호를 입력해주세요' }
    }
    return { error: '비밀번호 변경에 실패했어요. 잠시 후 다시 시도해주세요' }
  }
  return { success: true as const }
}
