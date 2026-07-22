// 테스트 전용 인메모리 Supabase 유사 클라이언트 (다중 테이블).
// vitest include 패턴(*.test.ts)에 걸리지 않으므로 테스트로 실행되지 않는다.
// 앱 코드는 이 파일을 import하지 않으므로 번들에도 포함되지 않는다.
export type FakeRow = Record<string, unknown>

export function makeFakeSupabase(tables: Record<string, FakeRow[]>) {
  function from(table: string) {
    const rows = tables[table] ?? (tables[table] = [])
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
      if (single) {
        if (found.length === 0) return { data: null, error: { message: 'not found' } }
        return { data: found[0], error: null }
      }
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
