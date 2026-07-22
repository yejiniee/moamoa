import { describe, it, expect } from 'vitest'
import { makeFakeSupabase, type FakeRow } from './testFakeDb'
import { closeFundingIfTargetReached } from './settlement'
import type { createServiceClient } from '@/lib/supabase/server'

type ServiceClient = ReturnType<typeof createServiceClient>

function setup(tables: Record<string, FakeRow[]>) {
  const db = makeFakeSupabase(tables) as unknown as ServiceClient
  return { db, tables }
}

describe('closeFundingIfTargetReached', () => {
  it('목표금액을 달성하고 진행중(active)이면 펀딩을 마감(closed)한다', async () => {
    const { db, tables } = setup({
      fundings: [{ id: 'f1', status: 'active' }],
      gifts: [{ funding_id: 'f1', target_amount: 10000 }],
      payments: [
        { funding_id: 'f1', status: 'confirmed', amount: 6000 },
        { funding_id: 'f1', status: 'confirmed', amount: 5000 },
      ],
    })

    await closeFundingIfTargetReached(db, 'f1')

    expect(tables.fundings[0].status).toBe('closed')
  })

  it('목표금액에 못 미치면 마감하지 않는다', async () => {
    const { db, tables } = setup({
      fundings: [{ id: 'f1', status: 'active' }],
      gifts: [{ funding_id: 'f1', target_amount: 10000 }],
      payments: [{ funding_id: 'f1', status: 'confirmed', amount: 3000 }],
    })

    await closeFundingIfTargetReached(db, 'f1')

    expect(tables.fundings[0].status).toBe('active')
  })

  it('확정(confirmed)되지 않은 결제는 합산하지 않는다', async () => {
    const { db, tables } = setup({
      fundings: [{ id: 'f1', status: 'active' }],
      gifts: [{ funding_id: 'f1', target_amount: 10000 }],
      payments: [
        { funding_id: 'f1', status: 'confirmed', amount: 3000 },
        { funding_id: 'f1', status: 'pending', amount: 9000 }, // 합산되면 안 됨
      ],
    })

    await closeFundingIfTargetReached(db, 'f1')

    expect(tables.fundings[0].status).toBe('active')
  })

  it('이미 진행중이 아닌(closed/settled) 펀딩은 건드리지 않는다', async () => {
    const { db, tables } = setup({
      fundings: [{ id: 'f1', status: 'settled' }],
      gifts: [{ funding_id: 'f1', target_amount: 1000 }],
      payments: [{ funding_id: 'f1', status: 'confirmed', amount: 5000 }],
    })

    await closeFundingIfTargetReached(db, 'f1')

    expect(tables.fundings[0].status).toBe('settled')
  })
})
