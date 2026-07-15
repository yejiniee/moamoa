import { describe, it, expect, beforeEach, vi } from 'vitest'

// createServerSupabaseClient(auth) / createServiceClient(DB)를 인메모리 가짜로 대체한다.
// payment/confirm 라우트 테스트와 동일한 패턴.

type Row = Record<string, unknown>

let funding: Row
let payments: Row[]
let currentUserId: string | null

function matches(row: Row, filters: [string, unknown][]) {
  return filters.every(([col, val]) => row[col] === val)
}

// 테이블별로 대상 데이터를 반환하는 가짜 쿼리 빌더
function makeServiceClient() {
  const builder = (table: string) => {
    const state = {
      op: 'select' as 'select' | 'update' | 'delete',
      filters: [] as [string, unknown][],
      payload: null as Row | null,
    }
    const rowsFor = () => (table === 'fundings' ? [funding] : payments)
    const run = (single: boolean) => {
      const rows = rowsFor()
      if (state.op === 'update') {
        rows.forEach((r) => {
          if (matches(r, state.filters)) Object.assign(r, state.payload)
        })
        return { data: null, error: null }
      }
      if (state.op === 'delete') {
        return { data: null, error: null }
      }
      const filtered = rows.filter((r) => matches(r, state.filters))
      if (single) {
        if (filtered.length === 0) return { data: null, error: { message: 'not found' } }
        return { data: { ...filtered[0] }, error: null }
      }
      return { data: filtered.map((r) => ({ ...r })), error: null }
    }
    const b: Record<string, unknown> = {
      select() { state.op = 'select'; return b },
      update(payload: Row) { state.op = 'update'; state.payload = payload; return b },
      delete() { state.op = 'delete'; return b },
      eq(col: string, val: unknown) { state.filters.push([col, val]); return b },
      order() { return b },
      single() { return Promise.resolve(run(true)) },
      then(res: (v: unknown) => unknown, rej: (e: unknown) => unknown) {
        return Promise.resolve(run(false)).then(res, rej)
      },
    }
    return b
  }
  return { from: (table: string) => builder(table) }
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUserId ? { id: currentUserId } : null } }) },
  }),
  createServiceClient: () => makeServiceClient(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { revalidatePath } = await import('next/cache')
const { closeFunding, settleFunding, deleteFunding } = await import('./actions')

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear()
  currentUserId = 'owner'
  funding = {
    id: 'f1',
    creator_user_id: 'owner',
    status: 'active',
    share_token: 'tok',
    settled_at: null,
    settled_amount: null,
  }
  payments = [
    { funding_id: 'f1', amount: 3000, status: 'confirmed' },
    { funding_id: 'f1', amount: 2000, status: 'confirmed' },
    { funding_id: 'f1', amount: 9999, status: 'pending' }, // 미확정 결제는 정산 금액에서 제외
  ]
})

const validBank = { bankName: '토스뱅크', accountNumber: '100012345678', accountHolder: '홍길동' }

describe('closeFunding (마감)', () => {
  it('진행중 펀딩을 마감하면 status가 closed로 바뀐다', async () => {
    const res = await closeFunding('f1')
    expect(res).toEqual({ success: true })
    expect(funding.status).toBe('closed')
  })

  it('소유자가 아니면 마감할 수 없다', async () => {
    currentUserId = 'stranger'
    const res = await closeFunding('f1')
    expect('error' in res).toBe(true)
    expect(funding.status).toBe('active')
  })

  it('이미 마감된 펀딩은 다시 마감할 수 없다', async () => {
    funding.status = 'closed'
    const res = await closeFunding('f1')
    expect('error' in res).toBe(true)
  })
})

describe('settleFunding (정산)', () => {
  it('마감된 펀딩만 정산할 수 있다', async () => {
    funding.status = 'active'
    const res = await settleFunding('f1', validBank)
    expect('error' in res).toBe(true)
    expect(funding.status).toBe('active')
  })

  it('마감된 펀딩을 정산하면 settled 상태와 확정 결제 합계가 기록된다', async () => {
    funding.status = 'closed'
    const res = await settleFunding('f1', validBank)
    expect(res).toEqual({ success: true })
    expect(funding.status).toBe('settled')
    expect(funding.settled_amount).toBe(5000) // confirmed 3000 + 2000, pending 제외
    expect(funding.settle_bank_name).toBe('토스뱅크')
    expect(funding.settle_account_number).toBe('100012345678')
    expect(funding.settle_account_holder).toBe('홍길동')
    expect(funding.settled_at).toBeTruthy()
  })

  it('이미 정산된 펀딩은 다시 정산할 수 없다', async () => {
    funding.status = 'settled'
    const res = await settleFunding('f1', validBank)
    expect('error' in res).toBe(true)
  })

  it('계좌 정보가 비어 있으면 정산할 수 없다', async () => {
    funding.status = 'closed'
    const res = await settleFunding('f1', { bankName: '', accountNumber: '', accountHolder: '' })
    expect('error' in res).toBe(true)
    expect(funding.status).toBe('closed')
  })

  it('소유자가 아니면 정산할 수 없다', async () => {
    funding.status = 'closed'
    currentUserId = 'stranger'
    const res = await settleFunding('f1', validBank)
    expect('error' in res).toBe(true)
    expect(funding.status).toBe('closed')
  })
})

describe('deleteFunding (삭제)', () => {
  it('삭제에 성공하면 내 펀딩 리스트(/funding) 캐시를 무효화한다', async () => {
    const res = await deleteFunding('tok')
    expect(res).toEqual({ success: true })
    // 삭제 후 리스트 페이지가 즉시 반영되려면 /funding 경로를 revalidate 해야 한다
    expect(revalidatePath).toHaveBeenCalledWith('/funding')
  })

  it('소유자가 아니면 삭제할 수 없다', async () => {
    currentUserId = 'stranger'
    const res = await deleteFunding('tok')
    expect('error' in res).toBe(true)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
