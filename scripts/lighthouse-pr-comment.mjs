import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? '.'
const rows = readdirSync(dir)
  .filter((f) => /^diff-(mobile|desktop)\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')))

function fmt(main, branch, unit = '', lowerIsBetter = true) {
  if (main == null || branch == null) return '-'
  const delta = branch - main
  if (delta === 0) return `${branch}${unit} (±0)`
  const good = lowerIsBetter ? delta < 0 : delta > 0
  const sign = delta > 0 ? '+' : ''
  const mark = good ? '🟢' : '🔴'
  return `${branch}${unit} (${sign}${delta}${unit} ${mark})`
}

const byDevice = { mobile: [], desktop: [] }
for (const row of rows) {
  ;(byDevice[row.device] ??= []).push(row)
}

let body = '## 🔦 Lighthouse: main vs PR 브랜치 (개발환경 CI 빌드 기준)\n\n'
body +=
  '같은 GitHub Actions 러너에서 main과 PR 브랜치를 각각 빌드/서빙해 동일한 조건으로 측정한 결과입니다. ' +
  '실제 배포(Vercel) 환경과는 절대값이 다를 수 있지만, PR 브랜치가 main 대비 성능을 얼마나 바꿨는지는 이 표로 판단할 수 있습니다.\n\n'

for (const device of ['mobile', 'desktop']) {
  const list = byDevice[device]
  if (!list?.length) continue
  body += `### ${device === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'}\n\n`
  body += '| 페이지 | Performance | LCP | TBT | CLS |\n'
  body += '|---|---|---|---|---|\n'
  for (const r of list.sort((a, b) => a.path.localeCompare(b.path))) {
    body += `| \`${r.path}\` | ${fmt(r.main?.performance, r.branch?.performance, '', false)} | ${fmt(r.main?.lcpMs, r.branch?.lcpMs, 'ms')} | ${fmt(r.main?.tbtMs, r.branch?.tbtMs, 'ms')} | ${fmt(r.main?.cls, r.branch?.cls)} |\n`
  }
  body += '\n'
}

body += '_괄호 안은 main 대비 변화량입니다. 🟢 개선 / 🔴 악화. 이 체크는 머지를 막지 않습니다._\n'

process.stdout.write(body)
