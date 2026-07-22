import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeFakeSupabase, type FakeRow } from './testFakeDb'
import { reconcilePayment, reconcileOrderId } from './reconcile'
import type { createServiceClient } from '@/lib/supabase/server'

type ServiceClient = ReturnType<typeof createServiceClient>

function setup(paymentOverrides: FakeRow = {}) {
  const tables: Record<string, FakeRow[]> = {
    payments: [
      { order_id: 'o1', funding_id: 'f1', amount: 5000, status: 'pending', payment_key: null, ...paymentOverrides },
    ],
    gifts: [{ funding_id: 'f1', target_amount: 1_000_000 }], // 기본은 목표 미달(마감 안 됨)
    fundings: [{ id: 'f1', status: 'active' }],
  }
  const db = makeFakeSupabase(tables) as unknown as ServiceClient
  return { db, tables, payment: tables.payments[0] }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('reconcilePayment - 결제 보정 결정 로직', () => {
  it('DONE이고 금액이 맞으면 pending을 confirmed로 바꾸고 payment_key를 채운다', async () => {
    const { db, payment } = setup()

    const result = await reconcilePayment(db, payment, { status: 'DONE', totalAmount: 5000, paymentKey: 'pk_1' })

    expect(result).toBe('confirmed')
    expect(payment.status).toBe('confirmed')
    expect(payment.payment_key).toBe('pk_1')
  })

  it('DONE이지만 금액이 다르면 확정하지 않고 amount_mismatch를 반환한다', async () => {
    const { db, payment } = setup()

    const result = await reconcilePayment(db, payment, { status: 'DONE', totalAmount: 9999, paymentKey: 'pk_1' })

    expect(result).toBe('amount_mismatch')
    expect(payment.status).toBe('pending')
  })

  it('CANCELED면 pending을 failed로 정리한다', async () => {
    const { db, payment } = setup()

    const result = await reconcilePayment(db, payment, { status: 'CANCELED', paymentKey: 'pk_1' })

    expect(result).toBe('failed')
    expect(payment.status).toBe('failed')
  })

  it('이미 confirmed면 아무 것도 하지 않는다(멱등)', async () => {
    const { db, payment } = setup({ status: 'confirmed', payment_key: 'pk_1' })

    const result = await reconcilePayment(db, payment, { status: 'DONE', totalAmount: 5000, paymentKey: 'pk_1' })

    expect(result).toBe('noop')
    expect(payment.status).toBe('confirmed')
  })

  it('확정으로 목표금액을 달성하면 펀딩도 자동 마감한다', async () => {
    const tables: Record<string, FakeRow[]> = {
      payments: [{ order_id: 'o1', funding_id: 'f1', amount: 5000, status: 'pending', payment_key: null }],
      gifts: [{ funding_id: 'f1', target_amount: 5000 }], // 이번 확정으로 목표 달성
      fundings: [{ id: 'f1', status: 'active' }],
    }
    const db = makeFakeSupabase(tables) as unknown as ServiceClient

    await reconcilePayment(db, tables.payments[0], { status: 'DONE', totalAmount: 5000, paymentKey: 'pk_1' })

    expect(tables.fundings[0].status).toBe('closed')
  })
})

describe('reconcileOrderId - orderId로 토스에 실제 상태를 물어 보정', () => {
  it('토스 조회가 DONE이면 확정한다', async () => {
    const { db, payment } = setup()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'DONE', totalAmount: 5000, paymentKey: 'pk_1' }),
    })))

    const result = await reconcileOrderId(db, 'o1')

    expect(result).toBe('confirmed')
    expect(payment.status).toBe('confirmed')
  })

  it('토스에 결제가 없으면(404) pending을 failed로 정리한다', async () => {
    const { db, payment } = setup()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))

    const result = await reconcileOrderId(db, 'o1')

    expect(result).toBe('failed')
    expect(payment.status).toBe('failed')
  })

  it('토스 조회가 일시적으로 실패하면(네트워크) 상태를 바꾸지 않는다', async () => {
    const { db, payment } = setup()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))

    const result = await reconcileOrderId(db, 'o1')

    expect(result).toBe('error')
    expect(payment.status).toBe('pending') // 함부로 실패로 만들지 않음
  })
})
