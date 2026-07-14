import { describe, it, expect, beforeEach, vi } from 'vitest'

// createServerSupabaseClient(auth + profiles)를 인메모리 가짜로 대체한다.
// admin/actions.test.ts와 동일한 vi.mock 패턴.

type Row = Record<string, unknown>
let profilesRows: Row[]
let currentUserId: string | null
let updateUserCalledWith: { password?: string } | null
let updateUserError: { message: string } | null

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUserId ? { id: currentUserId } : null } }),
      updateUser: async (attrs: { password?: string }) => {
        updateUserCalledWith = attrs
        return { data: {}, error: updateUserError }
      },
    },
    from: (table: string) => ({
      upsert: async (payload: Row) => {
        if (table !== 'profiles') return { error: { message: 'wrong table' } }
        const idx = profilesRows.findIndex((r) => r.user_id === payload.user_id)
        if (idx >= 0) profilesRows[idx] = { ...profilesRows[idx], ...payload }
        else profilesRows.push({ ...payload })
        return { error: null }
      },
    }),
  }),
}))

vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

const { updateBankAccount, changePassword } = await import('./actions')

beforeEach(() => {
  currentUserId = 'user1'
  profilesRows = []
  updateUserCalledWith = null
  updateUserError = null
})

const validBank = { bankName: '토스뱅크', accountNumber: '100012345678', accountHolder: '홍길동' }

describe('updateBankAccount (저장하기)', () => {
  it('유효한 계좌를 저장하면 profiles에 upsert된다', async () => {
    const res = await updateBankAccount(validBank)
    expect(res).toEqual({ success: true })
    expect(profilesRows).toHaveLength(1)
    expect(profilesRows[0]).toMatchObject({
      user_id: 'user1',
      bank_name: '토스뱅크',
      account_number: '100012345678',
      account_holder: '홍길동',
    })
  })

  it('계좌 정보가 비어 있으면 저장하지 않는다', async () => {
    const res = await updateBankAccount({ bankName: '', accountNumber: '', accountHolder: '' })
    expect('error' in res).toBe(true)
    expect(profilesRows).toHaveLength(0)
  })

  it('로그인하지 않으면 저장할 수 없다', async () => {
    currentUserId = null
    const res = await updateBankAccount(validBank)
    expect('error' in res).toBe(true)
    expect(profilesRows).toHaveLength(0)
  })
})

describe('changePassword (변경하기)', () => {
  it('유효한 비밀번호로 변경하면 updateUser가 호출된다', async () => {
    const res = await changePassword('newpass123')
    expect(res).toEqual({ success: true })
    expect(updateUserCalledWith).toEqual({ password: 'newpass123' })
  })

  it('비밀번호가 8자 미만이면 변경하지 않는다', async () => {
    const res = await changePassword('short')
    expect('error' in res).toBe(true)
    expect(updateUserCalledWith).toBeNull()
  })

  it('로그인하지 않으면 변경할 수 없다', async () => {
    currentUserId = null
    const res = await changePassword('newpass123')
    expect('error' in res).toBe(true)
    expect(updateUserCalledWith).toBeNull()
  })

  it('기존 비밀번호와 같으면 안내 메시지를 반환한다', async () => {
    updateUserError = { message: 'New password should be different from the old password.' }
    const res = await changePassword('newpass123')
    expect(res).toEqual({ error: '기존 비밀번호와 다른 비밀번호를 입력해주세요' })
  })

  it('updateUser가 실패하면 친화적 에러를 반환한다', async () => {
    updateUserError = { message: 'some internal error' }
    const res = await changePassword('newpass123')
    expect(res).toEqual({ error: '비밀번호 변경에 실패했어요. 잠시 후 다시 시도해주세요' })
  })
})
