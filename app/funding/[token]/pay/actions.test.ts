import { describe, it, expect, beforeEach, vi } from 'vitest'

// createServiceClient(DB)를 인메모리 가짜로 대체한다. (admin/route 테스트와 동일 패턴)

type Row = Record<string, unknown>

let funding: Row | null
let inserted: Row[]

function makeServiceClient() {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {
      select() { return b },
      eq() { return b },
      single() {
        if (table === 'fundings') {
          return Promise.resolve({ data: funding, error: funding ? null : { message: 'not found' } })
        }
        return Promise.resolve({ data: null, error: null })
      },
      insert(payload: Row) {
        if (table === 'payments') inserted.push(payload)
        return Promise.resolve({ data: null, error: null })
      },
    }
    return b
  }
  return { from: (table: string) => builder(table) }
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeServiceClient(),
}))

const { createPendingPayment } = await import('./actions')

beforeEach(() => {
  funding = { status: 'active' }
  inserted = []
})

describe('createPendingPayment (결제 생성)', () => {
  it('진행중 펀딩에 정상 금액이면 orderId를 반환하고 결제행을 만든다', async () => {
    const res = await createPendingPayment('f1', '홍길동', '축하해', 5000)
    expect('orderId' in res).toBe(true)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({ funding_id: 'f1', amount: 5000, status: 'pending' })
  })

  it('최소 금액(1000원) 미만은 거부한다', async () => {
    const res = await createPendingPayment('f1', '홍길동', '', 999)
    expect('error' in res).toBe(true)
    expect(inserted).toHaveLength(0)
  })

  it('상한(1천만원) 초과 금액은 거부한다', async () => {
    const res = await createPendingPayment('f1', '홍길동', '', 10_000_001)
    expect('error' in res).toBe(true)
    expect(inserted).toHaveLength(0)
  })

  it('정수가 아닌 금액은 거부한다', async () => {
    const res = await createPendingPayment('f1', '홍길동', '', 5000.5)
    expect('error' in res).toBe(true)
    expect(inserted).toHaveLength(0)
  })

  it('이름이 비면 거부한다', async () => {
    const res = await createPendingPayment('f1', '   ', '', 5000)
    expect('error' in res).toBe(true)
    expect(inserted).toHaveLength(0)
  })

  // 회귀 방지: 존재하지 않는 펀딩으로 임의 결제행을 만들지 못한다
  it('존재하지 않는 펀딩이면 거부한다', async () => {
    funding = null
    const res = await createPendingPayment('nope', '홍길동', '', 5000)
    expect('error' in res).toBe(true)
    expect(inserted).toHaveLength(0)
  })

  // 회귀 방지: 마감/정산완료 펀딩에는 결제행을 만들지 못한다
  it('진행중이 아닌 펀딩(closed)이면 거부한다', async () => {
    funding = { status: 'closed' }
    const res = await createPendingPayment('f1', '홍길동', '', 5000)
    expect('error' in res).toBe(true)
    expect(inserted).toHaveLength(0)
  })
})
