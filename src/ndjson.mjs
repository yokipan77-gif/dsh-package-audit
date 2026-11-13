/** One package per record; workspace metadata precedes its member records. */
export function toNDJSON(report) {
  if (!Array.isArray(report.packages)) return JSON.stringify({ type: 'package', ...report })
  const { packages, ...summary } = report
  return [
    { type: 'workspace', ...summary, packageCount: packages.length },
    ...packages.map(pkg => ({ type: 'package', ...pkg })),
  ].map(record => JSON.stringify(record)).join('\n')
}
