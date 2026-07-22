import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 다중 테이블 인메모리 클라이언트 (lib/payments/testFakeDb와 동일 방식)
type FakeRow = Record<string, unknown>
let tables: Record<string, FakeRow[]>

function makeClient(t: Record<string, FakeRow[]>) {
  function from(table: string) {
    const rows = t[table] ?? (t[table] = [])
    const eqs: [string, unknown][] = []
    const lts: [string, unknown][] = []
    let op: 'select' | 'update' = 'select'
    let payload: FakeRow | null = null
    const match = (r: FakeRow) =>
      eqs.every(([c, v]) => r[c] === v) &&
      lts.every(([c, v]) => (r[c] as number | string) < (v as number | string))
    const exec = (single: boolean) => {
      if (op === 'update') {
        for (const r of rows) if (match(r)) Object.assign(r, payload)
        return { data: null, error: null }
      }
      const found = rows.filter(match).map((r) => ({ ...r }))
      if (single) return found.length ? { data: found[0], error: null } : { data: null, error: { message: 'nf' } }
      return { data: found, error: null }
    }
    const b: Record<string, unknown> = {
      select() { op = 'select'; return b },
      update(p: FakeRow) { op = 'update'; payload = p; return b },
      eq(c: string, v: unknown) { eqs.push([c, v]); return b },
      lt(c: string, v: unknown) { lts.push([c, v]); return b },
      single() { return Promise.resolve(exec(true)) },
      then(res: (v: unknown) => unknown, rej: (e: unknown) => unknown) {
        return Promise.resolve(exec(false)).then(res, rej)
      },
    }
    return b
  }
  return { from }
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeClient(tables),
}))

const { POST, GET } = await import('./route')

function makeReq(headers: Record<string, string>) {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as Parameters<typeof POST>[0]
}

const OLD = '2020-01-01T00:00:00.000Z' // 확실히 오래된 시각

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'secret-token')
  tables = {
    payments: [
      { order_id: 'o1', funding_id: 'f1', amount: 5000, status: 'pending', payment_key: null, created_at: OLD },
    ],
    gifts: [{ funding_id: 'f1', target_amount: 1_000_000 }],
    fundings: [{ id: 'f1', status: 'active' }],
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('POST /api/payment/reconcile - 미확정 pending 복구 배치', () => {
  it('시크릿이 없거나 틀리면 401', async () => {
    const res = await POST(makeReq({ authorization: 'Bearer wrong' }))
    expect(res.status).toBe(401)
    expect(tables.payments[0].status).toBe('pending') // 아무 것도 안 함
  })

  it('올바른 시크릿이면 오래된 pending을 토스 조회로 보정한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'DONE', totalAmount: 5000, paymentKey: 'pk_1' }),
    })))

    const res = await POST(makeReq({ authorization: 'Bearer secret-token' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(tables.payments[0].status).toBe('confirmed')
    expect(json.confirmed).toBe(1)
  })

  // Vercel Cron은 GET으로 호출하므로 GET도 동일하게 동작해야 한다.
  it('GET도 시크릿이 없으면 401', async () => {
    const res = await GET(makeReq({}))
    expect(res.status).toBe(401)
    expect(tables.payments[0].status).toBe('pending')
  })

  it('GET도 올바른 시크릿이면 보정한다(Vercel Cron 경로)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'DONE', totalAmount: 5000, paymentKey: 'pk_1' }),
    })))

    const res = await GET(makeReq({ authorization: 'Bearer secret-token' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(tables.payments[0].status).toBe('confirmed')
    expect(json.confirmed).toBe(1)
  })
})
