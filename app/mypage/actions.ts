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

// 비밀번호 바꾸기: 현재 비밀번호를 재확인한 뒤 새 비밀번호를 설정한다.
// (세션만으로 바꾸게 두면 세션 탈취 시 즉시 비밀번호가 바뀔 수 있어 재인증한다.)
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  if (!newPassword || newPassword.length < 8) {
    return { error: '비밀번호는 8자 이상이어야 합니다' }
  }
  if (!currentPassword) {
    return { error: '현재 비밀번호를 입력해주세요' }
  }
  if (!user.email) {
    return { error: '비밀번호를 변경할 수 없는 계정이에요' }
  }

  // 현재 비밀번호 재확인. 틀리면 기존 세션은 그대로 두고 변경만 거부한다.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (reauthError) return { error: '현재 비밀번호가 올바르지 않습니다' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    if (error.message?.includes('should be different')) {
      return { error: '기존 비밀번호와 다른 비밀번호를 입력해주세요' }
    }
    return { error: '비밀번호 변경에 실패했어요. 잠시 후 다시 시도해주세요' }
  }
  return { success: true as const }
}
