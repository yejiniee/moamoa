import { describe, it, expect, beforeEach, vi } from 'vitest'

// createServerSupabaseClient(auth) / createServiceClient(DB)를 인메모리 가짜로 대체.
// IDOR 회귀 방지: gift 수정이 반드시 해당 펀딩(funding_id)으로 스코프되는지 검증한다.

type Row = Record<string, unknown>

let fundings: Row[]
let gifts: Row[]
let currentUserId: string | null

function matches(row: Row, filters: [string, unknown][]) {
  return filters.every(([col, val]) => row[col] === val)
}

function makeServiceClient() {
  const builder = (table: string) => {
    const state = {
      op: 'select' as 'select' | 'update',
      filters: [] as [string, unknown][],
      payload: null as Row | null,
    }
    const rowsFor = () => (table === 'fundings' ? fundings : gifts)
    const run = (single: boolean) => {
      const rows = rowsFor()
      if (state.op === 'update') {
        rows.forEach((r) => {
          if (matches(r, state.filters)) Object.assign(r, state.payload)
        })
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
      eq(col: string, val: unknown) { state.filters.push([col, val]); return b },
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

const { updateFunding } = await import('./actions')

beforeEach(() => {
  currentUserId = 'owner'
  fundings = [
    { id: 'fB', creator_user_id: 'owner', share_token: 'tokB' },
    { id: 'fA', creator_user_id: 'victim', share_token: 'tokA' },
  ]
  gifts = [
    { id: 'giftA', funding_id: 'fA', name: '피해자선물', target_amount: 100, description: '' },
  ]
})

const baseData = (giftId: string) => ({
  title: '내펀딩',
  description: '',
  endDate: '2026-12-31',
  imageUrl: null,
  gift: { id: giftId, name: '해킹시도', targetAmount: 999, description: '변조' },
})

describe('updateFunding (IDOR 방지)', () => {
  it('내 펀딩의 gift는 정상 수정된다', async () => {
    gifts.push({ id: 'giftB', funding_id: 'fB', name: '원래', target_amount: 100, description: '' })
    const res = await updateFunding('tokB', baseData('giftB'))
    expect(res).toEqual({ success: true })
    const giftB = gifts.find((g) => g.id === 'giftB')!
    expect(giftB.name).toBe('해킹시도')
    expect(giftB.target_amount).toBe(999)
  })

  // 회귀 방지: 내 펀딩(fB)을 수정하면서 남의 펀딩(fA) gift id를 넘겨도 바뀌면 안 된다
  it('다른 펀딩 소속 gift는 수정되지 않는다', async () => {
    const res = await updateFunding('tokB', baseData('giftA'))
    expect(res).toEqual({ success: true })
    const giftA = gifts.find((g) => g.id === 'giftA')!
    expect(giftA.name).toBe('피해자선물') // 변조 안 됨
    expect(giftA.target_amount).toBe(100)
  })

  it('소유자가 아니면 수정할 수 없다', async () => {
    currentUserId = 'stranger'
    const res = await updateFunding('tokB', baseData('giftB'))
    expect('error' in res).toBe(true)
  })
})
