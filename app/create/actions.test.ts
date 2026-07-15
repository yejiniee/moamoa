import { describe, it, expect, beforeEach, vi } from 'vitest'

// createServerSupabaseClient(auth) / createServiceClient(DB)를 인메모리 가짜로 대체한다.
// 회귀 방지: 펀딩 생성 후 목록(/funding) 캐시가 무효화되는지 검증한다.

type Row = Record<string, unknown>

let currentUserId: string | null
let insertError: { message: string } | null

function makeServiceClient() {
  const builder = () => {
    const b: Record<string, unknown> = {
      insert() { return b },
      select() { return b },
      single() {
        return Promise.resolve({ data: { id: 'new-funding' }, error: insertError })
      },
      then(res: (v: unknown) => unknown, rej: (e: unknown) => unknown) {
        // gifts insert (single 없이 await)
        return Promise.resolve({ data: null, error: insertError }).then(res, rej)
      },
    }
    return b
  }
  return { from: () => builder() }
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUserId ? { id: currentUserId } : null } }) },
  }),
  createServiceClient: () => makeServiceClient(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { revalidatePath } = await import('next/cache')
const { createFunding } = await import('./actions')

const validData = {
  title: '생일 펀딩',
  description: '',
  imageUrl: null,
  endDate: '2026-12-31',
  gifts: [{ name: '선물', targetAmount: 50000, description: '' }],
}

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear()
  currentUserId = 'owner'
  insertError = null
})

describe('createFunding (펀딩 생성)', () => {
  it('생성에 성공하면 shareToken을 반환한다', async () => {
    const res = await createFunding(validData)
    expect('shareToken' in res).toBe(true)
  })

  // 회귀 방지: 생성 직후 목록 페이지가 바로 갱신되도록 /funding 캐시를 무효화해야 한다
  it('생성에 성공하면 /funding 캐시를 무효화한다', async () => {
    await createFunding(validData)
    expect(revalidatePath).toHaveBeenCalledWith('/funding')
  })

  it('선물이 없으면 생성하지 않는다', async () => {
    const res = await createFunding({ ...validData, gifts: [] })
    expect('error' in res).toBe(true)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('로그인하지 않으면 생성할 수 없다', async () => {
    currentUserId = null
    const res = await createFunding(validData)
    expect('error' in res).toBe(true)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
