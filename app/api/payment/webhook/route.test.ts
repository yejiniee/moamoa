import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// createServiceClient를 인메모리 스토어 기반 가짜 클라이언트로 대체한다.
// (confirm 라우트 테스트와 동일한 단일 행 방식)
let store: Record<string, unknown>

function matches(row: Record<string, unknown>, filters: [string, unknown][]) {
  return filters.every(([col, val]) => row[col] === val)
}

function makeClient(row: Record<string, unknown>) {
  const builder = () => {
    const state = {
      op: 'select' as 'select' | 'update',
      filters: [] as [string, unknown][],
      payload: null as Record<string, unknown> | null,
    }
    const run = (single: boolean) => {
      if (state.op === 'update') {
        if (matches(row, state.filters)) Object.assign(row, state.payload)
        return { data: null, error: null }
      }
      if (single && !matches(row, state.filters)) {
        return { data: null, error: { message: 'not found' } }
      }
      return { data: single ? { ...row } : [{ ...row }], error: null }
    }
    const b: Record<string, unknown> = {
      select() { state.op = 'select'; return b },
      update(payload: Record<string, unknown>) { state.op = 'update'; state.payload = payload; return b },
      eq(col: string, val: unknown) { state.filters.push([col, val]); return b },
      single() { return Promise.resolve(run(true)) },
      // .update(...).eq(...) 처럼 single 없이 await 되는 체인을 위한 thenable
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

const { POST } = await import('./route')

function makeReq(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0]
}

// 토스 결제 상태 조회 API 응답을 흉내내는 fetch 스텁
function stubLookup(response: { ok: boolean; payload?: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: response.ok,
      json: async () => response.payload ?? {},
    })),
  )
}

const webhookBody = { eventType: 'PAYMENT_STATUS_CHANGED', data: { paymentKey: 'pk_1', orderId: 'o1' } }

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

describe('POST /api/payment/webhook - 결제 상태 보정', () => {
  it('토스 조회가 DONE이고 금액이 맞으면 pending 결제를 confirmed로 보정한다', async () => {
    stubLookup({ ok: true, payload: { orderId: 'o1', status: 'DONE', totalAmount: 5000 } })

    const res = await POST(makeReq(webhookBody))

    expect(store.status).toBe('confirmed')
    expect(store.payment_key).toBe('pk_1')
    expect(res.status).toBe(200)
  })

  it('본문을 신뢰하지 않는다 — 조회 금액이 저장 금액과 다르면 확정하지 않는다', async () => {
    stubLookup({ ok: true, payload: { orderId: 'o1', status: 'DONE', totalAmount: 9999 } })

    const res = await POST(makeReq(webhookBody))

    expect(store.status).toBe('pending') // 위조/불일치 → 확정 금지
    expect(res.status).toBe(400)
  })

  it('토스 조회가 CANCELED면 pending 결제를 failed로 정리한다', async () => {
    stubLookup({ ok: true, payload: { orderId: 'o1', status: 'CANCELED', totalAmount: 5000 } })

    const res = await POST(makeReq(webhookBody))

    expect(store.status).toBe('failed')
    expect(res.status).toBe(200)
  })

  it('이미 confirmed면 멱등하게 아무 것도 바꾸지 않는다', async () => {
    store.status = 'confirmed'
    store.payment_key = 'pk_1'
    stubLookup({ ok: true, payload: { orderId: 'o1', status: 'DONE', totalAmount: 5000 } })

    const res = await POST(makeReq(webhookBody))

    expect(store.status).toBe('confirmed')
    expect(res.status).toBe(200)
  })

  it('paymentKey가 유효하지 않으면(조회 실패) 상태를 바꾸지 않는다', async () => {
    stubLookup({ ok: false })

    const res = await POST(makeReq(webhookBody))

    expect(store.status).toBe('pending') // 위조 웹훅으로 확정되면 안 됨
    expect(res.status).toBe(400)
  })

  it('paymentKey/orderId가 없으면 400', async () => {
    stubLookup({ ok: true, payload: {} })

    const res = await POST(makeReq({ eventType: 'PAYMENT_STATUS_CHANGED', data: {} }))

    expect(res.status).toBe(400)
  })
})
