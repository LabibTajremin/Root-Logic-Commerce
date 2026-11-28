// Dev helper: list uncovered lines/branches per file from the per-layer lcov reports.
import { existsSync, readFileSync } from 'node:fs'

const only = process.argv[2]
for (const layer of ['unit', 'browser', 'server']) {
  const f = `coverage/${layer}/lcov.info`
  if (!existsSync(f)) continue
  for (const rec of readFileSync(f, 'utf8').split('end_of_record')) {
    const sf = rec.match(/SF:(.*)/)?.[1]
    if (!sf || (only && !sf.includes(only))) continue
    const lines = [...rec.matchAll(/^DA:(\d+),0$/gm)].map((m) => m[1])
    const br = [...rec.matchAll(/^BRDA:(\d+),\d+,\d+,(0|-)$/gm)].map((m) => m[1])
    const fnLine = new Map([...rec.matchAll(/^FN:(\d+),(.*)$/gm)].map((m) => [m[2], m[1]]))
    const fns = [...rec.matchAll(/^FNDA:0,(.*)$/gm)].map((m) => `${m[1]}@${fnLine.get(m[1])}`)
    if (lines.length || br.length || fns.length)
      console.log(
        `${layer} ${sf.replace(/.*rlc\//, '')}  lines:${lines.join(',')}  branches@${[...new Set(br)].join(',')}  functions:${fns.join(',')}`,
      )
  }
}
