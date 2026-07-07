import { readFileSync } from 'node:fs'
import { JWT } from 'google-auth-library'
import { GoogleSpreadsheet } from 'google-spreadsheet'

const REQUIRED_ENV = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID']

function readManifest() {
  const raw = process.env.LHCI_MANIFEST
  if (!raw) throw new Error('LHCI_MANIFEST 환경변수가 없습니다 (lighthouse-ci-action의 manifest 출력을 전달해주세요)')
  return JSON.parse(raw)
}

function pickMetrics(lhr) {
  const audits = lhr.audits
  return {
    performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    fcpMs: Math.round(audits['first-contentful-paint']?.numericValue ?? 0),
    lcpMs: Math.round(audits['largest-contentful-paint']?.numericValue ?? 0),
    tbtMs: Math.round(audits['total-blocking-time']?.numericValue ?? 0),
    cls: Number((audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
    speedIndexMs: Math.round(audits['speed-index']?.numericValue ?? 0),
  }
}

async function main() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) throw new Error(`${key} 환경변수가 없습니다`)
  }

  const manifest = readManifest()
  const representative = manifest.filter((run) => run.isRepresentativeRun !== false)

  const rows = []
  for (const run of representative) {
    if (!run.jsonPath) {
      console.warn(`[lighthouse-to-sheet] ${run.url}는 리포트가 없어 건너뜁니다 (측정 실패)`)
      continue
    }
    try {
      const lhr = JSON.parse(readFileSync(run.jsonPath, 'utf-8'))
      const metrics = pickMetrics(lhr)
      rows.push({
        timestamp: new Date().toISOString(),
        commit: (process.env.GITHUB_SHA ?? '').slice(0, 7),
        branch: process.env.BRANCH || process.env.GITHUB_REF_NAME || '',
        url: run.url,
        device: process.env.DEVICE ?? 'mobile',
        performance: metrics.performance,
        fcp_ms: metrics.fcpMs,
        lcp_ms: metrics.lcpMs,
        tbt_ms: metrics.tbtMs,
        cls: metrics.cls,
        speed_index_ms: metrics.speedIndexMs,
      })
    } catch (err) {
      console.warn(`[lighthouse-to-sheet] ${run.url} 결과 처리 실패, 건너뜁니다:`, err.message)
    }
  }

  if (rows.length === 0) {
    console.log('기록할 Lighthouse 결과가 없습니다')
    return
  }

  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth)
  await doc.loadInfo()
  const sheet = doc.sheetsByIndex[0]
  await sheet.addRows(rows)

  console.log(`${rows.length}개 행을 "${sheet.title}" 시트에 기록했습니다 (branch=${rows[0].branch}, commit=${rows[0].commit})`)
  for (const row of rows) {
    console.log(`  - [${row.device}] ${row.url}: performance=${row.performance}, LCP=${row.lcp_ms}ms, CLS=${row.cls}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
