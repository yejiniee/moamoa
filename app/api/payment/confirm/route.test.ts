import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// createServiceClient를 인메모리 스토어 기반 가짜 클라이언트로 대체한다.
let store: Record<string, unknown>

function matches(row: Record<string, unknown>, filters: [string, unknown][]) {
  return filters.every(([col, val]) => row[col] === val)
}

function makeClient(row: Record<string, unknown>) {
  const builder = () => {
    const state = {
      op: 'select' as 'select' | 'update' | 'insert',
      filters: [] as [string, unknown][],
      payload: null as Record<string, unknown> | null,
    }
    const run = (single: boolean) => {
      if (state.op === 'update') {
        if (matches(row, state.filters)) Object.assign(row, state.payload)
        return { data: null, error: null }
      }
      // select
      if (single && !matches(row, state.filters)) {
        return { data: null, error: { message: 'not found' } }
      }
      return { data: single ? { ...row } : [{ ...row }], error: null }
    }
    const b: Record<string, unknown> = {
      select() { state.op = 'select'; return b },
      update(payload: Record<string, unknown>) { state.op = 'update'; state.payload = payload; return b },
      insert(payload: Record<string, unknown>) { state.op = 'insert'; state.payload = payload; return b },
      eq(col: string, val: unknown) { state.filters.push([col, val]); return b },
      in() { return b },
      order() { return b },
      single() { return Promise.resolve(run(true)) },
      then(res: (v: unknown) => unknown, rej: (e: unknown) => unknown) {
        return Promise.resolve(run(false)).then(res, rej)
      },
    }
    return b
  }
  return { from: () => builder() }
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeClient(store),
}))

// 라우트는 모듈 로드 시 위 mock을 사용하므로 mock 선언 후 import 한다.
const { POST } = await import('./route')

function makeReq(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0]
}

const validBody = { paymentKey: 'pk_1', orderId: 'o1', amount: 5000 }

beforeEach(() => {
  store = {
    order_id: 'o1',
    funding_id: 'f1',
    amount: 5000,
    status: 'pending',
    payment_key: null,
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('POST /api/payment/confirm - 동시 확인 요청 경합', () => {
  it('다른 요청이 이미 confirmed 처리한 결제를 failed로 덮어쓰지 않는다', async () => {
    // 토스 confirm이 "이미 처리중"으로 거부되는 동안, 동시 요청(승자)이 결제를 확정한 상황을 재현한다.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        store.status = 'confirmed' // 동시 요청이 먼저 확정
        return { ok: false, json: async () => ({ message: '이미 처리중인 요청입니다' }) }
      }),
    )

    const res = await POST(makeReq(validBody))
    const json = await res.json()

    expect(store.status).toBe('confirmed') // failed로 덮어쓰이면 안 됨
    expect(json.success).toBe(true) // 실제 결제는 성공했으므로 성공으로 응답
  })

  it('경합 없이 토스가 거부하면 pending 결제만 failed로 표시한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({ message: '결제 실패' }) })),
    )

    const res = await POST(makeReq(validBody))
    const json = await res.json()

    expect(store.status).toBe('failed')
    expect(json.error).toBeTruthy()
  })
})
