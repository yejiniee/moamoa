import { readFileSync, writeFileSync } from 'node:fs'

function pickMetrics(lhr) {
  const audits = lhr.audits
  return {
    performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    lcpMs: Math.round(audits['largest-contentful-paint']?.numericValue ?? 0),
    tbtMs: Math.round(audits['total-blocking-time']?.numericValue ?? 0),
    cls: Number((audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
  }
}

function readManifest(raw) {
  if (!raw) return []
  return JSON.parse(raw).filter((run) => run.isRepresentativeRun !== false)
}

function pathOf(url) {
  try {
    return new URL(url).pathname || '/'
  } catch {
    return url
  }
}

function collect(manifest) {
  const byPath = new Map()
  for (const run of manifest) {
    if (!run.jsonPath) continue
    try {
      const lhr = JSON.parse(readFileSync(run.jsonPath, 'utf-8'))
      byPath.set(pathOf(run.url), pickMetrics(lhr))
    } catch (err) {
      console.warn(`[lighthouse-diff] ${run.url} 결과 처리 실패, 건너뜁니다:`, err.message)
    }
  }
  return byPath
}

const device = process.env.DEVICE ?? 'mobile'
const main = collect(readManifest(process.env.LHCI_MANIFEST_MAIN))
const branch = collect(readManifest(process.env.LHCI_MANIFEST_BRANCH))

const paths = new Set([...main.keys(), ...branch.keys()])
const rows = [...paths].sort().map((path) => ({
  path,
  device,
  main: main.get(path) ?? null,
  branch: branch.get(path) ?? null,
}))

writeFileSync(process.env.OUTPUT_PATH, JSON.stringify(rows))
